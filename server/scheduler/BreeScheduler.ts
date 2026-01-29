import Bree from 'bree';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Job {
  id: number;
  type: 'instagram_post' | 'auto_generation';
  run_at: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retries: number;
  payload: any;
  created_at: Date;
  updated_at: Date;
}

export class BreeScheduler {
  private static instance: BreeScheduler;
  private bree: Bree | null = null;
  private isInitialized = false;

  static getInstance(): BreeScheduler {
    if (!BreeScheduler.instance) {
      BreeScheduler.instance = new BreeScheduler();
    }
    return BreeScheduler.instance;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log("📅 BreeScheduler: Initializing...");
    
    try {
      this.bree = new Bree({
        root: join(__dirname, '../jobs'),
        defaultExtension: 'ts',
        doInit: true,
        initRoot: join(__dirname, '../jobs/init'),
        initFunction: 'init',
        jobs: [
          {
            name: 'instagram-post',
            path: join(__dirname, '../jobs/instagram-post.ts'),
            interval: 'at 10:00am', // Default schedule, will be updated dynamically
          },
          {
            name: 'auto-generation',
            path: join(__dirname, '../jobs/auto-generation.ts'),
            interval: 'at 9:00am', // Default schedule, will be updated dynamically
          },
          {
            name: 'cleanup',
            path: join(__dirname, '../jobs/cleanup.ts'),
            interval: 'at 2:00am',
          }
        ],
        errorHandler: (error, workerMetadata) => {
          console.error(`❌ BreeScheduler: Job ${workerMetadata.name} failed:`, error);
          this.handleJobFailure(workerMetadata.name, error as Error);
        }
      });

      await this.bree.start();
      this.isInitialized = true;
      
      console.log("✅ BreeScheduler: Initialized successfully");
    } catch (error) {
      console.error("❌ BreeScheduler: Failed to initialize:", error);
      throw error;
    }
  }

  private async handleJobFailure(jobName: string, _error: Error) {
    // Handle retry logic for failed jobs
    console.log(`🔄 BreeScheduler: Handling failure for job ${jobName}`);
    
    // You can implement retry logic here
    // For example, reschedule the job with exponential backoff
    if (this.bree) {
      const job = this.bree.config.jobs?.find(j => j.name === jobName);
      if (job) {
        // Implement retry logic as needed
        console.log(`📅 BreeScheduler: Job ${jobName} will be retried according to schedule`);
      }
    }
  }

  // Public API methods
  async scheduleInstagramPost(imageId: number, scheduledAt: Date) {
    if (!this.bree) {
      console.warn("⚠️ BreeScheduler: Not initialized, cannot schedule job");
      return;
    }

    try {
      // Store job data in a simple in-memory storage or database
      const jobData = {
        id: Date.now(),
        type: 'instagram_post' as const,
        imageId,
        scheduledAt,
        status: 'pending' as const,
        retries: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Add or update the job with specific schedule
      this.bree.add({
        name: `instagram-post-${imageId}`,
        path: join(__dirname, '../jobs/instagram-post.ts'),
        date: scheduledAt,
        worker: {
          jobData
        }
      });

      console.log(`📅 BreeScheduler: Scheduled Instagram post for image ${imageId} at ${scheduledAt.toISOString()}`);
    } catch (error) {
      console.error(`❌ BreeScheduler: Failed to schedule Instagram post:`, error);
      throw error;
    }
  }

  async scheduleAutoGeneration(runAt: Date) {
    if (!this.bree) {
      console.warn("⚠️ BreeScheduler: Not initialized, cannot schedule job");
      return;
    }

    try {
      const jobData = {
        id: Date.now(),
        type: 'auto_generation' as const,
        scheduledAt: runAt,
        status: 'pending' as const,
        retries: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Update or add the auto-generation job
      if (this.bree.config.jobs?.find(j => j.name === 'auto-generation')) {
        this.bree.remove('auto-generation');
      }

      this.bree.add({
        name: 'auto-generation',
        path: join(__dirname, '../jobs/auto-generation.ts'),
        date: runAt,
        worker: {
          jobData
        }
      });

      console.log(`📅 BreeScheduler: Scheduled auto generation at ${runAt.toISOString()}`);
    } catch (error) {
      console.error(`❌ BreeScheduler: Failed to schedule auto generation:`, error);
      throw error;
    }
  }

  async getPendingJobs(): Promise<Job[]> {
    // This would typically query a database
    // For now, return jobs from Bree's internal state
    if (!this.bree) return [];

    const jobs: Job[] = [];
    
    // Get jobs from Bree's internal state
    const breeJobs = this.bree.config.jobs || [];
    
    for (const breeJob of breeJobs) {
      if (breeJob.name && (breeJob.name.includes('instagram-post') || breeJob.name.includes('auto-generation'))) {
        jobs.push({
          id: parseInt(breeJob.name.split('-').pop() || '0'),
          type: breeJob.name.includes('instagram-post') ? 'instagram_post' : 'auto_generation',
          run_at: breeJob.date || new Date(),
          status: 'pending',
          retries: 0,
          payload: (breeJob as any).worker?.jobData || {},
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    return jobs;
  }

  async getJobHistory(): Promise<Job[]> {
    // This would typically query a database for job history
    // For now, return empty array
    return [];
  }

  async cancelJob(jobId: number) {
    if (!this.bree) return;

    try {
      // Try to find and remove the job
      const jobName = `instagram-post-${jobId}`;
      if (this.bree.config.jobs?.find(j => j.name === jobName)) {
        this.bree.remove(jobName);
        console.log(`🚫 BreeScheduler: Cancelled job ${jobId}`);
      }
    } catch (error) {
      console.error(`❌ BreeScheduler: Failed to cancel job ${jobId}:`, error);
    }
  }

  async stop() {
    if (this.bree) {
      try {
        await this.bree.stop();
        console.log("🛑 BreeScheduler: Stopped");
      } catch (error) {
        console.error("❌ BreeScheduler: Error stopping:", error);
      }
    }
    this.isInitialized = false;
  }

  isAvailable(): boolean {
    return this.isInitialized && this.bree !== null;
  }
}
