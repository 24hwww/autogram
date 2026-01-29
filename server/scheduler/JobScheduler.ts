import { storage } from "../storage";
import { InstagramService } from "../services/instagram";
import { db } from "../db";
import { sql } from "drizzle-orm";

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

export class JobScheduler {
  private static instance: JobScheduler;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  static getInstance(): JobScheduler {
    if (!JobScheduler.instance) {
      JobScheduler.instance = new JobScheduler();
    }
    return JobScheduler.instance;
  }

  async initialize() {
    console.log("📅 JobScheduler: Initializing...");
    
    // Create jobs table if it doesn't exist
    await this.createJobsTable();
    
    // Start the polling loop
    this.startPolling();
    
    console.log("✅ JobScheduler: Initialized successfully");
  }

  private async createJobsTable() {
    try {
      // Create jobs table using raw SQL for table creation
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('instagram_post', 'auto_generation')),
          run_at DATETIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
          retries INTEGER DEFAULT 0,
          payload TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create index for efficient querying
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_jobs_run_at_status 
        ON jobs(run_at, status) 
        WHERE status IN ('pending', 'running')
      `);
      
      console.log("✅ JobScheduler: Jobs table ready");
    } catch (error) {
      console.error("❌ JobScheduler: Failed to create jobs table:", error);
      throw error;
    }
  }

  private startPolling() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log("🔄 JobScheduler: Starting polling loop...");
    
    // Poll every 30 seconds for pending jobs
    this.pollInterval = setInterval(async () => {
      await this.processPendingJobs();
    }, 30000);
  }

  private async processPendingJobs() {
    try {
      // Get pending jobs that are ready to run
      const jobs = await db.execute(sql`
        SELECT * FROM jobs 
        WHERE status = 'pending' 
        AND run_at <= datetime('now')
        ORDER BY run_at ASC
        LIMIT 10
      `);

      for (const job of jobs as Job[]) {
        await this.executeJob(job);
      }
    } catch (error) {
      console.error("❌ JobScheduler: Error processing pending jobs:", error);
    }
  }

  private async executeJob(job: Job) {
    try {
      // Mark job as running
      await this.updateJobStatus(job.id, 'running');
      
      console.log(`🔄 JobScheduler: Executing job ${job.id} (${job.type})`);
      
      // Execute job based on type
      if (job.type === 'instagram_post') {
        await this.executeInstagramPost(job);
      } else if (job.type === 'auto_generation') {
        await this.executeAutoGeneration(job);
      }
      
      // Mark job as completed
      await this.updateJobStatus(job.id, 'completed');
      console.log(`✅ JobScheduler: Job ${job.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ JobScheduler: Job ${job.id} failed:`, error);
      
      // Handle retries
      const maxRetries = 3;
      if (job.retries < maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, job.retries) * 60000; // 1min, 2min, 4min
        const nextRunAt = new Date(Date.now() + retryDelay);
        
        await db.execute(sql`
          UPDATE jobs 
          SET status = 'pending', 
              retries = retries + 1,
              run_at = ${nextRunAt.toISOString()},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${job.id}
        `);
        
        console.log(`🔄 JobScheduler: Job ${job.id} scheduled for retry ${job.retries + 1}/${maxRetries} at ${nextRunAt.toISOString()}`);
      } else {
        // Mark as failed after max retries
        await this.updateJobStatus(job.id, 'failed');
        console.log(`❌ JobScheduler: Job ${job.id} failed permanently after ${maxRetries} retries`);
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
      console.log(`ℹ️ JobScheduler: Image ${imageId} already published, skipping`);
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

  private async executeAutoGeneration(_job: Job) {
    const { Orchestrator } = await import("../automation/orchestrator");
    await Orchestrator.generateAndPost();
  }

  private async updateJobStatus(jobId: number, status: Job['status']) {
    await db.execute(sql`
      UPDATE jobs 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${jobId}
    `);
  }

  // Public API methods
  async scheduleInstagramPost(imageId: number, scheduledAt: Date) {
    const payload = { imageId };
    
    await db.execute(sql`
      INSERT INTO jobs (type, run_at, status, payload)
      VALUES ('instagram_post', ${scheduledAt.toISOString()}, 'pending', ${JSON.stringify(payload)})
    `);
    
    console.log(`📅 JobScheduler: Scheduled Instagram post for image ${imageId} at ${scheduledAt.toISOString()}`);
  }

  async scheduleAutoGeneration(runAt: Date) {
    const payload = {};
    
    await db.execute(sql`
      INSERT INTO jobs (type, run_at, status, payload)
      VALUES ('auto_generation', ${runAt.toISOString()}, 'pending', ${JSON.stringify(payload)})
    `);
    
    console.log(`📅 JobScheduler: Scheduled auto generation at ${runAt.toISOString()}`);
  }

  async getPendingJobs(): Promise<Job[]> {
    const jobs = await db.execute(sql`
      SELECT * FROM jobs 
      WHERE status = 'pending' 
      ORDER BY run_at ASC
    `);
    
    return jobs as Job[];
  }

  async getJobHistory(limit = 50): Promise<Job[]> {
    const jobs = await db.execute(sql`
      SELECT * FROM jobs 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `);
    
    return jobs as Job[];
  }

  async cancelJob(jobId: number) {
    await db.execute(sql`
      UPDATE jobs 
      SET status = 'failed', 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${jobId} AND status = 'pending'
    `);
    
    console.log(`🚫 JobScheduler: Cancelled job ${jobId}`);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    this.isRunning = false;
    console.log("🛑 JobScheduler: Stopped");
  }
}
