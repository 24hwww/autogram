import { IgApiClient } from 'instagram-private-api';
import { type ImageModel } from '@shared/schema';
import fs from 'fs';
import path from 'path';

const ig = new IgApiClient();

// Initialize the client
async function loginToInstagram() {
  if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
    throw new Error("Instagram credentials not found in environment variables");
  }

  ig.state.generateDevice(process.env.INSTAGRAM_USERNAME);
  await ig.account.login(process.env.INSTAGRAM_USERNAME, process.env.INSTAGRAM_PASSWORD);
}

export async function publishToInstagram(image: ImageModel): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    // Ensure logged in (simple approach: re-login or check session - for simplicity/robustness in this context, we'll login)
    // In a high-traffic production app, you'd manage session serialization.
    await loginToInstagram();

    const imagePath = path.join(process.cwd(), "client/public", image.imagePath);
    
    if (!fs.existsSync(imagePath)) {
      return { success: false, error: "Image file not found on server" };
    }

    const file = fs.readFileSync(imagePath);

    const publishResult = await ig.publish.photo({
      file: file,
      caption: image.caption || image.prompt, // Fallback to prompt if no caption
    });

    return { 
      success: true, 
      mediaId: publishResult.media.id 
    };

  } catch (error: any) {
    console.error("Instagram Publish Error:", error);
    return { 
      success: false, 
      error: error.message || "Unknown error during publication" 
    };
  }
}
