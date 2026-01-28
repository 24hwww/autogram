import { storage } from "./storage";
import { publishToInstagram } from "./instagram";
import Redis from "ioredis";
import { Queue, Worker, Job } from "bullmq";

const AUTO_PUBLISH_INTERVAL = 60000; // 1 minute
const REDIS_URL = process.env.REDIS_URL;

let publishQueue: Queue | null = null;
let publishWorker: Worker | null = null;

async function processPublishJob(image: any) {
  const currentImage = await storage.getImage(image.id);
  if (currentImage?.status !== 'scheduled') return;

  console.log(`Scheduler (Redis): Publishing image ${image.id}...`);
  const result = await publishToInstagram(image);

  await storage.updateImage(image.id, {
    status: result.success ? 'published' : 'failed',
    publishedAt: result.success ? new Date() : undefined,
    instagramMediaId: result.mediaId,
    error: result.error
  });
  console.log(`Scheduler (Redis): Image ${image.id} result: ${result.success ? 'Success' : 'Failed'}`);
}

export function startScheduler() {
  if (REDIS_URL) {
    try {
      console.log("Starting Redis-based Scheduler (BullMQ)...");
      const connection = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        connectTimeout: 5000,
        lazyConnect: true
      });

      // Attempt connection to verify Redis is there
      connection.on('error', (err) => {
        // console.warn("Redis Connection Error. Falling back to basic scheduler.");
      });

      publishQueue = new Queue("publish-queue", { connection });
      publishWorker = new Worker("publish-queue", async (job: Job) => {
        await processPublishJob(job.data);
      }, { connection });

      // Poll for scheduled jobs and add to queue if not already there
      setInterval(async () => {
        try {
          const imagesToPublish = await storage.getScheduledImagesToPublish();
          for (const image of imagesToPublish) {
            await publishQueue?.add(`publish-${image.id}`, image, {
              jobId: `publish-${image.id}`,
              removeOnComplete: true,
              removeOnFail: false
            });
          }
        } catch (error) {
          console.error("Redis Scheduler Error:", error);
        }
      }, AUTO_PUBLISH_INTERVAL);

      return; // Success
    } catch (error) {
      console.error("Failed to initialize Redis scheduler:", error);
    }
  }

  // Fallback or No Redis URL
  console.log("Starting basic setInterval Scheduler...");
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
