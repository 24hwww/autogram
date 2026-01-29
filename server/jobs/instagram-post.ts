import { storage } from "../storage";
import { InstagramService } from "../services/instagram";

interface JobData {
  id: number;
  type: 'instagram_post';
  imageId: number;
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retries: number;
  created_at: Date;
  updated_at: Date;
}

export default async function (job: { data: JobData }) {
  const { imageId } = job.data;
  
  console.log(`🔄 Bree Job: Processing Instagram post for image ${imageId}`);
  
  try {
    const image = await storage.getImage(imageId);
    
    if (!image) {
      throw new Error(`Image ${imageId} not found`);
    }
    
    if (image.status === 'published') {
      console.log(`ℹ️ Bree Job: Image ${imageId} already published, skipping`);
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
      
      console.log(`✅ Bree Job: Successfully published image ${imageId}`);
    } else {
      throw new Error(result.error || "Instagram publish failed");
    }
    
  } catch (error) {
    console.error(`❌ Bree Job: Failed to publish image ${imageId}:`, error);
    
    // Update image status to failed
    await storage.updateImage(imageId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error; // Re-throw to let Bree handle retries
  }
}
