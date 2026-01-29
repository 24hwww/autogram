import { ContentGenerator } from "./contentGenerator";
import { LlamaService } from "../services/llama";
import { HuggingFaceService } from "../services/huggingface";
import { InstagramService } from "../services/instagram";
import { RetryQueue } from "./retryQueue";
import { storage } from "../storage";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { broadcast } from "../ws";

export class Orchestrator {

    /**
     * Main entry point: Generates a new post from scratch and attempts to publish/schedule it.
     */
    static async generateAndPost() {
        console.log("🚀 Orchestrator: Starting automated generation cycle...");
        let imageId: number | null = null;

        try {
            // 1. Generate Concept
            const concept = await ContentGenerator.generatePostConcept();
            console.log(`💡 Concept Generated (${concept.type}): ${concept.prompt.substring(0, 50)}...`);

            // 2. Generate Image (Photo or Text-based)
            let buffer: Buffer;

            try {
                if (concept.type === 'verse') {
                    const { ImageGeneratorService } = await import("../services/imageGenerator");
                    // Use the prompt as the verse text (concept.prompt holds the text in verse mode)
                    buffer = await ImageGeneratorService.generateTextImage(concept.prompt, concept.author);
                } else {
                    // New: Hugging Face (Stable Diffusion)
                    buffer = await HuggingFaceService.generateImage(concept.prompt);
                }
            } catch (genError) {
                console.error("❌ Image generation service failed:", genError);
                throw genError;
            }

            // Save to disk
            const storageDir = path.join(process.cwd(), "client/public/generated_images");
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }

            const filename = `${crypto.randomUUID()}.png`;
            const filePath = path.join(storageDir, filename);
            fs.writeFileSync(filePath, buffer);

            const publicPath = `/generated_images/${filename}`;

            // 3. Save to DB first as PENDING
            const newImage = await storage.createImage({
                prompt: concept.prompt,
                caption: concept.caption,
                imagePath: publicPath,
                status: 'PENDING',
                scheduledAt: null,
                autoSchedule: true,
                imagePaths: JSON.stringify([publicPath]),
                isCarousel: false
            } as any);

            imageId = newImage.id;
            console.log(`💾 Image generated and saved to DB (ID: ${imageId}) - Status: PENDING`);

            // Broadcast to all clients
            broadcast({ type: "IMAGE_GENERATED", payload: newImage });

            // 4. Try to check Instagram connection and publish
            const instagramStatus = await InstagramService.getConnectionStatus();

            if (instagramStatus.connected && instagramStatus.sessionValid) {
                console.log(`📡 Instagram is connected. Attempting immediate publication for image ${imageId}...`);
                await this.publishWithRetry(imageId);
            } else {
                console.log(`⏳ Instagram not connected (Status: ${JSON.stringify(instagramStatus)}). Image ${imageId} remains PENDING.`);
                // We don't fail here, the image is already saved and ready for whenever Instagram is connected
            }

        } catch (error) {
            console.error("❌ Orchestrator Critical Failure:", error);
            if (imageId) {
                await storage.updateImage(imageId, {
                    status: 'FAILED',
                    error: `Generation failed: ${(error as any).message}`
                });
            }
        }
    }

    /**
     * Check if Instagram is currently connected and available
     */
    static async checkInstagramConnection(): Promise<boolean> {
        try {
            // Simple ping to Instagram service to check connection
            const testResult = await InstagramService.testConnection();
            return testResult;
        } catch (error) {
            console.log("🔍 Instagram connection check failed:", error instanceof Error ? error.message : error);
            return false;
        }
    }

    /**
     * Schedule a pending image for retry when Instagram becomes available
     */
    static async schedulePendingForRetry(imageId: number) {
        try {
            // Try to add to retry queue first
            await RetryQueue.add(imageId, "Instagram not connected - will retry when available");
        } catch (error) {
            console.warn("⚠️ Failed to add to retry queue, image remains pending:", error);
            // Image stays in 'pending' status, will be picked up by manual scheduler
        }
    }

    /**
     * Process all pending images when Instagram becomes available
     */
    static async processPendingImages() {
        try {
            console.log("🔄 Processing pending images...");

            // Get all pending images
            const pendingImages = await storage.getAllImages().then(images =>
                images.filter(img => img.status === 'PENDING')
            );

            if (pendingImages.length === 0) {
                console.log("✅ No pending images to process");
                return;
            }

            console.log(`📋 Found ${pendingImages.length} pending images`);

            for (const image of pendingImages) {
                try {
                    console.log(`⏳ Processing pending image ${image.id}...`);

                    // Update status to scheduled
                    await storage.updateImage(image.id, {
                        status: 'SCHEDULED',
                        scheduledAt: new Date()
                    });

                    // Attempt to publish
                    await this.publishWithRetry(image.id);

                } catch (error) {
                    console.error(`❌ Failed to process pending image ${image.id}:`, error);
                    await storage.updateImage(image.id, {
                        status: 'PENDING',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            console.log("✅ Pending images processing completed");
        } catch (error) {
            console.error("❌ Error processing pending images:", error);
        }
    }

    /**
     * Attempt to publish. If fails, send to Redis Retry Queue.
     */
    static async publishWithRetry(imageId: number) {
        const image = await storage.getImage(imageId);
        if (!image) return;

        console.log(`📡 Orchestrator: Attempting publication for Image ${imageId}`);
        const result = await InstagramService.publish(image);

        if (result.success) {
            console.log(`✅ Orchestrator: Published successfully (Media ID: ${result.mediaId})`);
            await storage.updateImage(imageId, {
                status: 'PUBLISHED',
                publishedAt: new Date(),
                instagramMediaId: result.mediaId
            });
        } else {
            console.warn(`⚠️ Orchestrator: Publication failed. Queueing for retry. Reason: ${result.error}`);
            // Send to Retry Queue
            await RetryQueue.add(imageId, result.error || "Unknown error");
        }
    }
}
