import { storage } from "./storage";
import { publishToInstagram } from "./instagram";

const AUTO_PUBLISH_INTERVAL = 60000; // 1 minute

export function startScheduler() {
  // Force fallback scheduler for npm run dev (no Redis)
  console.log("Starting basic setInterval Scheduler (fallback mode)...");
  setInterval(async () => {
    try {
      console.log("Scheduler: Checking for images to publish...");
      const imagesToPublish = await storage.getScheduledImagesToPublish();

      for (const image of imagesToPublish) {
        const currentImage = await storage.getImage(image.id);
        if (currentImage?.status !== 'scheduled') continue;

        console.log(`Scheduler: Publishing image ${image.id}...`);
        const result = await publishToInstagram(image);

        await storage.updateImage(image.id, {
          status: result.success ? 'published' : 'failed',
          publishedAt: result.success ? new Date() : undefined,
          instagramMediaId: result.mediaId,
          error: result.error
        });
      }
    } catch (error) {
      console.error("Scheduler Error:", error);
    }
  }, AUTO_PUBLISH_INTERVAL);
}
