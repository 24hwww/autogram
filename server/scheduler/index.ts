import { storage } from "../storage";
import { InstagramService } from "../services/instagram";

let schedulerInterval: NodeJS.Timeout | null = null;
let currentInterval = 60000; // 1 minute default
let isRunning = false;

export function startScheduler(intervalMs: number = 60000) {
  currentInterval = intervalMs;
  
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  
  isRunning = true;
  console.log(`Starting Scheduler with ${intervalMs}ms interval...`);
  
  schedulerInterval = setInterval(async () => {
    try {
      // Add random jitter to avoid fixed patterns
      const jitter = Math.floor(Math.random() * 15000);
      await new Promise(resolve => setTimeout(resolve, jitter));

      console.log("Scheduler: Checking for images to publish...");
      const imagesToPublish = await storage.getScheduledImagesToPublish();

      for (const image of imagesToPublish) {
        const currentImage = await storage.getImage(image.id);
        if (currentImage?.status !== 'SCHEDULED') continue;

        console.log(`Scheduler: Publishing image ${image.id}...`);
        const result = await InstagramService.publish(image);

        await storage.updateImage(image.id, {
          status: result.success ? 'PUBLISHED' : 'FAILED',
          publishedAt: result.success ? new Date() : undefined,
          instagramMediaId: result.mediaId,
          error: result.error
        });
      }
    } catch (error) {
      console.error("Scheduler Error:", error);
    }
  }, currentInterval);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  isRunning = false;
  console.log("Scheduler stopped");
}

export function getSchedulerStatus() {
  return {
    running: isRunning,
    interval: currentInterval,
    nextRun: isRunning ? new Date(Date.now() + currentInterval).toISOString() : undefined,
  };
}

export function updateSchedulerInterval(newInterval: number) {
  if (isRunning) {
    startScheduler(newInterval);
  } else {
    currentInterval = newInterval;
  }
  return currentInterval;
}

export async function triggerScheduler() {
  try {
    console.log("Manual scheduler trigger...");
    const imagesToPublish = await storage.getScheduledImagesToPublish();
    
    for (const image of imagesToPublish) {
      const currentImage = await storage.getImage(image.id);
      if (currentImage?.status !== 'SCHEDULED') continue;

      console.log(`Manual Trigger: Publishing image ${image.id}...`);
      const result = await InstagramService.publish(image);

      await storage.updateImage(image.id, {
        status: result.success ? 'PUBLISHED' : 'FAILED',
        publishedAt: result.success ? new Date() : undefined,
        instagramMediaId: result.mediaId,
        error: result.error
      });
    }
    
    return { success: true, message: `Processed ${imagesToPublish.length} scheduled images` };
  } catch (error: any) {
    console.error("Manual trigger error:", error);
    return { success: false, message: error.message };
  }
}
