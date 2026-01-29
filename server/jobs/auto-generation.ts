import { Orchestrator } from "../automation/orchestrator";

interface JobData {
  id: number;
  type: 'auto_generation';
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retries: number;
  created_at: Date;
  updated_at: Date;
}

export default async function (job: { data: JobData }) {
  console.log(`🔄 Bree Job: Starting auto-generation`);
  
  try {
    await Orchestrator.generateAndPost();
    console.log(`✅ Bree Job: Auto-generation completed successfully`);
  } catch (error) {
    console.error(`❌ Bree Job: Auto-generation failed:`, error);
    throw error; // Re-throw to let Bree handle retries
  }
}
