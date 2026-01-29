import { storage } from "../storage";
import { InstagramService } from "../services/instagram";

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

export class SimpleScheduler {
  private static instance: SimpleScheduler;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private jobs: Job[] = [];
  private nextId = 1;

  static getInstance(): SimpleScheduler {
    if (!SimpleScheduler.instance) {
      SimpleScheduler.instance = new SimpleScheduler();
    }
    return SimpleScheduler.instance;
  }

  async initialize() {
    console.log("📅 SimpleScheduler: Initializing...");
    
    // Start the polling loop
    this.startPolling();
    
    console.log("✅ SimpleScheduler: Initialized successfully (in-memory mode)");
  }

  private startPolling() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log("🔄 SimpleScheduler: Starting polling loop...");
    
    // Poll every 30 seconds for pending jobs
    this.pollInterval = setInterval(async () => {
      await this.processPendingJobs();
    }, 30000);
  }

  private async processPendingJobs() {
    try {
      // Get pending jobs that are ready to run
      const now = new Date();
      const readyJobs = this.jobs.filter(job => 
        job.status === 'pending' && 
        new Date(job.run_at) <= now
      );

      for (const job of readyJobs) {
        await this.executeJob(job);
      }
    } catch (error) {
      console.error("❌ SimpleScheduler: Error processing pending jobs:", error);
    }
  }

  private async executeJob(job: Job) {
    try {
      // Mark job as running
      job.status = 'running';
      job.updated_at = new Date();
      
      console.log(`🔄 SimpleScheduler: Executing job ${job.id} (${job.type})`);
      
      // Execute job based on type
      if (job.type === 'instagram_post') {
        await this.executeInstagramPost(job);
      } else if (job.type === 'auto_generation') {
        await this.executeAutoGeneration();
      }
      
      // Mark job as completed
      job.status = 'completed';
      job.updated_at = new Date();
      console.log(`✅ SimpleScheduler: Job ${job.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ SimpleScheduler: Job ${job.id} failed:`, error);
      
      // Handle retries
      const maxRetries = 3;
      if (job.retries < maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, job.retries) * 60000; // 1min, 2min, 4min
        const nextRunAt = new Date(Date.now() + retryDelay);
        
        job.status = 'pending';
        job.retries += 1;
        job.run_at = nextRunAt;
        job.updated_at = new Date();
        
        console.log(`🔄 SimpleScheduler: Job ${job.id} scheduled for retry ${job.retries}/${maxRetries} at ${nextRunAt.toISOString()}`);
      } else {
        // Mark as failed after max retries
        job.status = 'failed';
        job.updated_at = new Date();
        console.log(`❌ SimpleScheduler: Job ${job.id} failed permanently after ${maxRetries} retries`);
      }
    }
  }

  private async executeInstagramPost(job: Job) {
    const { imageId } = job.payload;
    const image = await storage.getImage(imageId);
    
    if (!image) {
      throw new Error(`Image ${imageId} not found`);
    }
    
    if (image.status === 'published') {
      console.log(`ℹ️ SimpleScheduler: Image ${imageId} already published, skipping`);
      return;
    }
    
    const result = await InstagramService.publish(image);
    
    if (result.success) {
      await storage.updateImage(imageId, {
        status: 'published',
        publishedAt: new Date(),
        instagramMediaId: result.mediaId,
        error: null
      });
    } else {
      throw new Error(result.error || "Instagram publish failed");
    }
  }

  private async executeAutoGeneration() {
    const { Orchestrator } = await import("../automation/orchestrator");
    await Orchestrator.generateAndPost();
  }

  // Public API methods
  async scheduleInstagramPost(imageId: number, scheduledAt: Date) {
    const job: Job = {
      id: this.nextId++,
      type: 'instagram_post',
      run_at: scheduledAt,
      status: 'pending',
      retries: 0,
      payload: { imageId },
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.jobs.push(job);
    console.log(`📅 SimpleScheduler: Scheduled Instagram post for image ${imageId} at ${scheduledAt.toISOString()}`);
  }

  async scheduleAutoGeneration(runAt: Date) {
    const job: Job = {
      id: this.nextId++,
      type: 'auto_generation',
      run_at: runAt,
      status: 'pending',
      retries: 0,
      payload: {},
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.jobs.push(job);
    console.log(`📅 SimpleScheduler: Scheduled auto generation at ${runAt.toISOString()}`);
  }

  async getPendingJobs(): Promise<Job[]> {
    return this.jobs.filter(job => job.status === 'pending');
  }

  async getJobHistory(limit = 50): Promise<Job[]> {
    return this.jobs
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  async cancelJob(jobId: number) {
    const job = this.jobs.find(j => j.id === jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.updated_at = new Date();
      console.log(`🚫 SimpleScheduler: Cancelled job ${jobId}`);
    }
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    this.isRunning = false;
    console.log("🛑 SimpleScheduler: Stopped");
  }
}
