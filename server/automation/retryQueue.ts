import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { InstagramService } from "../services/instagram";
import { storage } from "../storage";

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const QUEUE_NAME = "instagram-retry-queue";

export class RetryQueue {
    private static queue: Queue | null = null;
    private static worker: Worker | null = null;
    private static connection: Redis | null = null;

    static async init() {
        if (this.queue) return; // Already initialized

        console.log("🔄 RetryQueue: Initializing...");
        const connectionUrl = REDIS_URL;

        // Smart Connection Logic
        // If we fail to connect to 'redis' host (Docker DNS), try 'localhost' (Local Dev)
        try {
            this.connection = await this.createConnection(connectionUrl);

            // If connection is null, Redis is not available but we can continue
            if (!this.connection) {
                console.warn("⚠️ RetryQueue: Redis not available. Running without retry functionality.");
                this.queue = null;
                this.worker = null;
                return;
            }

            // If we are here, connection success
            console.log(`✅ RetryQueue: Redis connected (${this.connection.options.host})`);

            this.queue = new Queue(QUEUE_NAME, { connection: this.connection });

            this.worker = new Worker(QUEUE_NAME, async (job: Job) => {
                console.log(`🔄 RetryQueue: Processing retry job ${job.id} (Attempt ${job.attemptsMade + 1})`);
                const { imageId } = job.data;
                await this.processRetry(imageId);
            }, {
                connection: this.connection,
                limiter: {
                    max: 5,
                    duration: 60000
                }
            });

            this.worker.on('completed', job => {
                console.log(`✅ RetryQueue: Job ${job.id} completed!`);
            });

            this.worker.on('failed', (job, err) => {
                console.error(`❌ RetryQueue: Job ${job?.id} failed: ${err.message}`);
            });

        } catch (error) {
            console.warn("⚠️ RetryQueue: Redis initialization failed. Running without retry functionality:", error instanceof Error ? error.message : error);
            this.queue = null;
            this.worker = null;
            this.connection = null;
        }
    }

    static isAvailable(): boolean {
        return this.queue !== null && this.connection !== null;
    }

    // Helper to attempt connection with fallback
    private static async createConnection(url: string): Promise<Redis> {
        return new Promise((resolve, reject) => {
            const client = new Redis(url, {
                connectTimeout: 3000,
                retryStrategy: (times) => {
                    // Only retry a few times for initial connection verify
                    if (times > 3) return null;
                    return 200;
                },
                lazyConnect: true, // Don't auto-connect
                // Prevent unhandled error events
                maxRetriesPerRequest: 0,
                enableOfflineQueue: false,
                enableReadyCheck: false,
            });

            // Handle all error events to prevent unhandled errors
            client.on('error', (err) => {
                // Silently handle connection errors
                if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
                    // Expected errors when Redis is not available
                    return;
                }
            });

            // Prevent unhandled close events
            client.on('close', () => {
                // Silently handle close events
            });

            // Prevent unhandled end events
            client.on('end', () => {
                // Silently handle end events
            });

            // Try to connect with timeout
            const connectTimeout = setTimeout(() => {
                client.disconnect();
                reject(new Error('Redis connection timeout'));
            }, 5000);

            client.on('connect', () => {
                clearTimeout(connectTimeout);
                console.log(`✅ Redis connected successfully to ${url}`);
                resolve(client);
            });

            client.on('end', async () => {
                clearTimeout(connectTimeout);
                // If we gave up retrying
                if (!client.status || client.status === 'end') {
                    // Check if we can fallback
                    if (url.includes('redis://redis') || url.includes('//redis')) { // simplistic check for docker host
                        console.warn("⚠️ RetryQueue: Docker Redis host unreachable. Attempting fallback to localhost...");
                        const localUrl = url.replace('//redis', '//localhost');
                        try {
                            // Recursive attempt with new URL
                            const fallbackClient = await new Redis(localUrl, {
                                connectTimeout: 3000,
                                lazyConnect: false,
                                // Prevent unhandled errors on fallback too
                                maxRetriesPerRequest: 0,
                                enableOfflineQueue: false,
                                enableReadyCheck: false,
                            });
                            
                            // Handle fallback errors
                            fallbackClient.on('error', () => {});
                            fallbackClient.on('close', () => {});
                            fallbackClient.on('end', () => {});
                            
                            resolve(fallbackClient);
                            return;
                        } catch {
                            console.warn("⚠️ Redis fallback to localhost also failed. Running without Redis.");
                            resolve(null as any); // Allow running without Redis
                        }
                    } else {
                        console.warn("⚠️ Redis connection failed and no fallback available. Running without Redis.");
                        resolve(null as any); // Allow running without Redis
                    }
                }
            });

            // Start connection attempt
            client.connect().catch((err) => {
                clearTimeout(connectTimeout);
                reject(err);
            });
        });
    }

    static async add(imageId: number, errorReason: string) {
        if (!this.queue) {
            console.warn("⚠️ RetryQueue not available (Redis not connected). Cannot queue failed publication.");
            return;
        }

        console.log(`📥 RetryQueue: Adding image ${imageId} to retry queue. Reason: ${errorReason}`);

        await this.queue.add("retry-publish", { imageId }, {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 60000 * 15 // Start with 15 mins
            }
        });

        await storage.updateImage(imageId, {
            status: 'FAILED',
            error: errorReason
        });
    }

    private static async processRetry(imageId: number) {
        const image = await storage.getImage(imageId);
        if (!image) throw new Error("Image not found in DB");

        if (image.status === 'PUBLISHED') return;

        console.log(`🔄 RetryQueue: Retrying publication for Image ${imageId}...`);
        const result = await InstagramService.publish(image);

        if (result.success) {
            await storage.updateImage(imageId, {
                status: 'PUBLISHED',
                publishedAt: new Date(),
                instagramMediaId: result.mediaId,
                error: undefined
            });
        } else {
            throw new Error(result.error || "Publication failed");
        }
    }
}
