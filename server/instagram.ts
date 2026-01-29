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
    // Non-blocking login attempt: only wait if we absolutely must publish now
    if (!isConnected) {
      console.log("Instagram: Not connected yet. Attempting one-time login for publish...");
      try {
        await loginToInstagram();
      } catch (e) {
        return { success: false, error: "Instagram connection failed. Please check credentials and try again later." };
      }
    }

    const caption = image.caption || image.prompt;

    if (image.isCarousel && image.imagePaths) {
      // Handle both SQLite (JSON string) and PostgreSQL (array) formats
      const paths = typeof image.imagePaths === 'string'
        ? JSON.parse(image.imagePaths)
        : image.imagePaths;

      if (Array.isArray(paths) && paths.length > 1) {
        const items = paths.map((p: string) => ({
          file: fs.readFileSync(path.join(process.cwd(), "client/public", p))
        }));

        const publishResult = await ig.publish.album({
          items,
          caption,
        });

        return {
          success: true,
          mediaId: publishResult.id
        };
      }
    }

    // Default: publish single image
    const imagePath = path.join(process.cwd(), "client/public", image.imagePath);

    if (!fs.existsSync(imagePath)) {
      return { success: false, error: "Image file not found on server" };
    }

    const file = fs.readFileSync(imagePath);

    const publishResult = await ig.publish.photo({
      file: file,
      caption,
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

let isConnected = false;
let connectionError: string | null = null;
let retryTimeout: NodeJS.Timeout | null = null;

async function connectionLoop() {
  try {
    console.log("Instagram: Attempting to connect...");
    await loginToInstagram();
    await ig.account.currentUser();

    isConnected = true;
    connectionError = null;
    console.log("Instagram: Connected successfully!");

    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
  } catch (error: any) {
    isConnected = false;
    connectionError = error.message;
    console.error("Instagram Connection Error Detailed:", error);
    if (error.response) {
      console.error("Instagram Error Response:", error.response.body);
    }
    console.log("Instagram: Retrying in 30 seconds...");

    // Retry every 30 seconds until connected
    retryTimeout = setTimeout(connectionLoop, 30000);
  }
}

export function startInstagramConnection() {
  if (retryTimeout) return;
  connectionLoop();
}

export async function testInstagramConnection(): Promise<{ connected: boolean; error?: string }> {
  return { connected: isConnected, error: connectionError || undefined };
}
