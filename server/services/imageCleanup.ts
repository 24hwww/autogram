import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const CLEANUP_QUEUE_NAME = "image-cleanup-queue";
const DAYS_TO_KEEP = 3;

export class ImageCleanupService {
  private static queue: Queue | null = null;
  private static worker: Worker | null = null;
  private static connection: Redis | null = null;
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static async init() {
    console.log("🧹 ImageCleanupService: Initializing...");
    
    // Try to initialize Redis for scheduled cleanup
    try {
      this.connection = await this.createConnection(REDIS_URL);
      
      if (this.connection) {
        console.log("✅ ImageCleanupService: Redis connected for scheduled cleanup");
        
        this.queue = new Queue(CLEANUP_QUEUE_NAME, { connection: this.connection });
        
        this.worker = new Worker(CLEANUP_QUEUE_NAME, async () => {
          await this.performCleanup();
        }, {
          connection: this.connection,
        });

        this.worker.on('completed', () => {
          console.log("✅ ImageCleanupService: Scheduled cleanup completed");
        });

        this.worker.on('failed', (_, err) => {
          console.error("❌ ImageCleanupService: Scheduled cleanup failed:", err.message);
        });

        // Schedule daily cleanup at 2 AM
        await this.scheduleDailyCleanup();
        
      } else {
        console.warn("⚠️ ImageCleanupService: Redis not available. Will run cleanup on startup only.");
      }
    } catch (error) {
      console.warn("⚠️ ImageCleanupService: Redis initialization failed:", error instanceof Error ? error.message : error);
    }

    // Always run cleanup on startup
    await this.performCleanup();
  }

  private static async createConnection(url: string): Promise<Redis | null> {
    return new Promise((resolve) => {
      const client = new Redis(url, {
        connectTimeout: 3000,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return 200;
        },
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        enableReadyCheck: false,
      });

      client.on('error', () => {});

      const connectTimeout = setTimeout(() => {
        client.disconnect();
        resolve(null);
      }, 5000);

      client.on('connect', () => {
        clearTimeout(connectTimeout);
        resolve(client);
      });

      client.on('end', async () => {
        clearTimeout(connectTimeout);
        if (url.includes('redis://redis') || url.includes('//redis')) {
          const localUrl = url.replace('//redis', '//localhost');
          try {
            const fallbackClient = new Redis(localUrl, {
              connectTimeout: 3000,
              lazyConnect: false,
              maxRetriesPerRequest: 0,
              enableOfflineQueue: false,
              enableReadyCheck: false,
            });
            
            fallbackClient.on('error', () => {});
            fallbackClient.on('close', () => {});
            fallbackClient.on('end', () => {});
            
            resolve(fallbackClient);
            return;
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });

      client.connect().catch(() => {
        clearTimeout(connectTimeout);
        resolve(null);
      });
    });
  }

  private static async scheduleDailyCleanup() {
    if (!this.queue) return;

    // Schedule cleanup for every day at 2 AM
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

    const delayUntil2AM = tomorrow.getTime() - now.getTime();

    await this.queue.add(
      'daily-cleanup',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // Cron pattern: at 2:00 AM every day
        },
        delay: delayUntil2AM,
      }
    );

    console.log(`📅 ImageCleanupService: Scheduled daily cleanup at 2:00 AM (starting in ${Math.round(delayUntil2AM / (1000 * 60 * 60))} hours)`);
  }

  static async performCleanup() {
    console.log("🧹 ImageCleanupService: Starting image cleanup...");
    
    try {
      const storageDir = path.join(process.cwd(), "client/public/generated_images");
      
      if (!fs.existsSync(storageDir)) {
        console.log("📁 ImageCleanupService: Generated images directory does not exist");
        return;
      }

      const files = fs.readdirSync(storageDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);

      let deletedCount = 0;
      let totalSizeFreed = 0;

      for (const file of files) {
        const filePath = path.join(storageDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && stats.mtime < cutoffDate) {
          try {
            // Check if this image exists in database
            const imagePath = `/generated_images/${file}`;
            const images = await storage.getImages();
            const imageExists = images.some(img => 
              img.imagePath === imagePath || 
              (img.imagePaths && JSON.parse(img.imagePaths || '[]').includes(imagePath))
            );

            if (!imageExists) {
              // Delete the file
              fs.unlinkSync(filePath);
              deletedCount++;
              totalSizeFreed += stats.size;
              console.log(`🗑️  Deleted old image: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
            } else {
              console.log(`📋 Keeping image (exists in DB): ${file}`);
            }
          } catch (error) {
            console.error(`❌ Error processing file ${file}:`, error);
          }
        }
      }

      console.log(`✅ ImageCleanupService: Cleanup completed. Deleted ${deletedCount} files, freed ${(totalSizeFreed / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
      console.error("❌ ImageCleanupService: Cleanup failed:", error);
    }
  }

  static async cleanupOnFrontendStart() {
    console.log("🚀 ImageCleanupService: Running cleanup on frontend start...");
    await this.performCleanup();
  }

  static isRedisAvailable(): boolean {
    return this.connection !== null && this.queue !== null;
  }

  static async stop() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
    
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
