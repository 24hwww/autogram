import { storage } from "./storage";
import { publishToInstagram } from "./instagram";

const AUTO_PUBLISH_INTERVAL = 60000; // 1 minute

export function startScheduler() {
  console.log("Starting Scheduler...");
  
  setInterval(async () => {
    try {
      console.log("Scheduler: Checking for images to publish...");
      const imagesToPublish = await storage.getScheduledImagesToPublish();
      
      if (imagesToPublish.length === 0) {
        return;
      }

      console.log(`Scheduler: Found ${imagesToPublish.length} images to publish.`);

      for (const image of imagesToPublish) {
        // Double check status to avoid race conditions (though single-threaded JS helps)
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

        console.log(`Scheduler: Image ${image.id} result: ${result.success ? 'Success' : 'Failed'}`);
      }

    } catch (error) {
      console.error("Scheduler Error:", error);
    }
  }, AUTO_PUBLISH_INTERVAL);
}
