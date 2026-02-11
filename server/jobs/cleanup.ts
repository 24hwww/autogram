interface JobData {
  id: number;
  type: 'cleanup';
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retries: number;
  created_at: Date;
  updated_at: Date;
}

export default async function (_job: { data: JobData }) {
  console.log(`🧹 Bree Job: Running cleanup tasks`);
  
  try {
    // Add cleanup logic here
    // For example: clean up old temp files, logs, etc.
    
    console.log(`✅ Bree Job: Cleanup completed successfully`);
  } catch (error) {
    console.error(`❌ Bree Job: Cleanup failed:`, error);
    throw error;
  }
}
