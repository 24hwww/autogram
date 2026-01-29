import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from 'zod';
import { generateImage } from "./replit_integrations/image/client";
import path from "path";
import fs from "fs";
import type { Express } from "express";
import { DAILY_IMAGE_LIMIT } from "@shared/types";
import { startScheduler } from "./scheduler";
import { InstagramService } from "./services/instagram";
import { requireAuth } from "./auth";
import crypto from "crypto";
import { broadcast } from "./ws";
import { ProfileService } from "./services/profile";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Ensure storage directory exists
  const storageDir = path.join(process.cwd(), "client/public/generated_images");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Helper to get today's date YYYY-MM-DD
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // List Images (Public)
  app.get(api.images.list.path, async (req, res) => {
    const images = await storage.getImages();
    res.json(images);
  });

  app.post("/api/instagram/cookies", requireAuth, async (req, res) => {
    const { username, cookies } = z
      .object({
        username: z.string().min(1),
        cookies: z.unknown(),
      })
      .parse(req.body);

    try {
      const { InstagramService } = await import("./services/instagram");
      await InstagramService.loginWithCookies(username, cookies);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Instagram cookie login failed",
      });
    }
  });

  // Get Image (Public)
  app.get(api.images.get.path, async (req, res) => {
    const image = await storage.getImage(Number(req.params.id));
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.json(image);
  });

  // Generate Image
  app.post(api.images.generate.path, requireAuth, async (req, res) => {
    try {
      // 1. Check Usage Limits
      const today = getTodayDate();
      const usage = await storage.getUsageLimit(today);

      if (usage.imagesGenerated >= DAILY_IMAGE_LIMIT) {
        return res.status(429).json({
          message: "Daily image generation limit reached",
          remaining: 0
        });
      }

      // 2. Validate Input
      const input = api.images.generate.input.parse(req.body);

      // 3. Generate with Gemini
      const imageCount = input.isCarousel ? (input.imageCount || 2) : 1;
      const imagePaths: string[] = [];
      const { buildInfluencerPrompt } = await import("./prompts/influencer");

      for (let i = 0; i < imageCount; i++) {
        // Build the prompt using the influencer persona
        const generationPrompt = buildInfluencerPrompt(input.prompt) +
          (input.isCarousel ? ` (image ${i + 1} of ${imageCount})` : "") +
          " instagram style, high quality, square aspect ratio";

        const base64DataUrl = await generateImage(generationPrompt);

        // 4. Save Image to Disk
        const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${crypto.randomUUID()}.png`;
        const filePath = path.join(storageDir, filename);
        fs.writeFileSync(filePath, buffer);
        imagePaths.push(`/generated_images/${filename}`);
      }

      const publicPath = imagePaths[0]; // Legacy fallback

      // 5. Create DB Record
      const status = input.autoSchedule ? 'SCHEDULED' : 'PENDING';
      let scheduledAt = input.scheduleAt ? new Date(input.scheduleAt) : null;

      if (input.autoSchedule && !scheduledAt) {
        if (input.scheduleInterval) {
          scheduledAt = new Date(Date.now() + input.scheduleInterval * 60000);
        } else {
          scheduledAt = new Date();
        }
      }

      const image = await storage.createImage({
        prompt: input.prompt,
        caption: input.caption,
        imagePath: publicPath,
        status: status,
        scheduledAt: scheduledAt,
        autoSchedule: input.autoSchedule,
        scheduleInterval: input.scheduleInterval,
        isCarousel: input.isCarousel,
        imagePaths: JSON.stringify(imagePaths),
      } as any);

      broadcast({ type: "IMAGE_GENERATED", payload: image });

      // 6. Increment Usage
      await storage.incrementUsageCount(today);

      res.status(201).json(image);

    } catch (err) {
      console.error("Generate error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  // Generate Prompt Only
  app.post(api.generate.prompt.path, async (req, res) => {
    try {
      const input = api.generate.prompt.input.parse(req.body);
      const { ContentGenerator } = await import("./automation/contentGenerator");
      
      let concept;
      if (input.theme || input.timeOfDay || input.contentType) {
        // Use provided context
        const context = {
          theme: input.theme || "lifestyle",
          timeOfDay: input.timeOfDay || "day",
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
        };
        
        const profile = await storage.getInfluencerProfile() || {
          id: 0,
          name: 'Default Influencer',
          personality: 'Friendly and engaging',
          physicalDescription: 'A modern lifestyle influencer',
          activities: 'Fitness, wellness, motivation',
          tone: 'engaging',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const recentPosts = await storage.getRecentPublishedImages(5);
        const recentContext = recentPosts.length > 0
          ? recentPosts.map(p => `- Prompt: ${p.prompt.substring(0, 100)}\n  Caption: ${p.caption?.substring(0, 100)}`).join('\n')
          : "No previous posts yet.";
        
        if (input.contentType === 'verse') {
          const { LlamaService } = await import("./services/llama");
          const verseData = await LlamaService.generateVerse(context.theme);
          const caption = await LlamaService.generateCaption(`Bible verse: ${verseData.text}`, profile, "inspirational", recentContext);
          
          concept = {
            type: 'verse' as const,
            prompt: verseData.text,
            author: verseData.reference,
            caption: caption,
            context
          };
        } else {
          const { LlamaService } = await import("./services/llama");
          const imagePrompt = await LlamaService.generateImagePrompt(context.theme, context.timeOfDay, profile, recentContext);
          const caption = await LlamaService.generateCaption(imagePrompt, profile, "engaging", recentContext);
          
          concept = {
            type: 'image' as const,
            prompt: imagePrompt,
            caption: caption,
            context
          };
        }
      } else {
        // Auto-generate concept
        concept = await ContentGenerator.generatePostConcept();
      }
      
      res.json({
        prompt: concept.prompt,
        caption: concept.caption,
        type: concept.type,
        author: concept.author,
      });
    } catch (error: any) {
      console.error("Prompt generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate prompt" });
    }
  });

  // Full Auto-Generation Workflow
  app.post(api.generate.full.path, async (req, res) => {
    try {
      const input = api.generate.full.input.parse(req.body);
      const { Orchestrator } = await import("./automation/orchestrator");
      
      if (input.autoPublish) {
        // Run full workflow including publish
        await Orchestrator.generateAndPost();
        
        // Return the most recent generated image
        const images = await storage.getAllImages();
        const latest = images.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
        
        if (!latest) {
          return res.status(500).json({ message: "No image was generated" });
        }
        
        res.status(201).json(latest);
      } else {
        // Generate concept only
        const { ContentGenerator } = await import("./automation/contentGenerator");
        const concept = await ContentGenerator.generatePostConcept();
        
        // Generate image buffer
        let buffer: Buffer;
        if (concept.type === 'verse') {
          const { ImageGeneratorService } = await import("./services/imageGenerator");
          buffer = await ImageGeneratorService.generateTextImage(concept.prompt, concept.author);
        } else {
          const { HuggingFaceService } = await import("./services/huggingface");
          buffer = await HuggingFaceService.generateImage(concept.prompt);
        }
        
        // Save to disk
        const storageDir = path.join(process.cwd(), "client/public/generated_images");
        if (!fs.existsSync(storageDir)) {
          fs.mkdirSync(storageDir, { recursive: true });
        }
        
        const filename = `${crypto.randomUUID()}.png`;
        const filePath = path.join(storageDir, filename);
        fs.writeFileSync(filePath, buffer);
        
        const publicPath = `/generated_images/${filename}`;
        
        // Save to DB
        const newImage = await storage.createImage({
          prompt: concept.prompt,
          caption: concept.caption,
          imagePath: publicPath,
          status: 'PENDING',
          scheduledAt: null,
          autoSchedule: false,
          imagePaths: JSON.stringify([publicPath]),
          isCarousel: false
        } as any);
        
        broadcast({ type: "IMAGE_GENERATED", payload: newImage });
        res.status(201).json(newImage);
      }
    } catch (error: any) {
      console.error("Full generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate content" });
    }
  });

  // Scheduler Control Endpoints
  app.get(api.scheduler.status.path, async (req, res) => {
    try {
      const { getSchedulerStatus } = await import("./scheduler");
      const status = getSchedulerStatus();
      
      // Get scheduled count
      const scheduledImages = await storage.getScheduledImagesToPublish();
      
      res.json({
        ...status,
        scheduledCount: scheduledImages.length,
      });
    } catch (error: any) {
      console.error("Scheduler status error:", error);
      res.status(500).json({ message: error.message || "Failed to get scheduler status" });
    }
  });

  app.post(api.scheduler.updateInterval.path, async (req, res) => {
    try {
      const input = api.scheduler.updateInterval.input.parse(req.body);
      const { updateSchedulerInterval } = await import("./scheduler");
      
      const newInterval = updateSchedulerInterval(input.interval);
      
      res.json({
        success: true,
        interval: newInterval,
      });
    } catch (error: any) {
      console.error("Scheduler interval update error:", error);
      res.status(500).json({ message: error.message || "Failed to update scheduler interval" });
    }
  });

  app.post(api.scheduler.trigger.path, async (req, res) => {
    try {
      const { triggerScheduler } = await import("./scheduler");
      const result = await triggerScheduler();
      
      res.json(result);
    } catch (error: any) {
      console.error("Scheduler trigger error:", error);
      res.status(500).json({ message: error.message || "Failed to trigger scheduler" });
    }
  });

  // Publish Manually
  app.post(api.images.publish.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const image = await storage.getImage(id);
      if (!image) return res.status(404).json({ message: "Image not found" });

      // Attempt publish
      const result = await InstagramService.publish(image);

      const updated = await storage.updateImage(id, {
        status: result.success ? 'PUBLISHED' : 'FAILED',
        publishedAt: result.success ? new Date() : undefined,
        instagramMediaId: result.mediaId,
        error: result.error
      });

      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }

      res.json(updated);
    } catch (err) {
      console.error("Error updating image:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/instagram/status", requireAuth, async (_req, res) => {
    const { InstagramService } = await import("./services/instagram");
    const status = InstagramService.getConnectionStatus();
    res.json(status);
  });

  app.post("/api/instagram/login", requireAuth, async (req, res) => {
    const { username, password } = z
      .object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
      .parse(req.body);

    try {
      const { InstagramService } = await import("./services/instagram");
      await InstagramService.loginWithCredentials(username, password);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Instagram login failed",
      });
    }
  });

  // Schedule
  app.post(api.images.schedule.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const { scheduledAt } = api.images.schedule.input.parse(req.body);

    const image = await storage.getImage(id);
    if (!image) return res.status(404).json({ message: "Image not found" });

    const updated = await storage.updateImage(id, {
      status: 'SCHEDULED',
      scheduledAt: new Date(scheduledAt)
    });

    res.json(updated);
  });

  // Get Limits (Public)
  app.get(api.limits.get.path, async (req, res) => {
    const today = getTodayDate();
    const usage = await storage.getUsageLimit(today);

    // We don't want to test connection on every limit check to avoid rate limits
    // but for now let's do it as it's a direct user request.
    const { InstagramService } = await import("./services/instagram");
    const connection = InstagramService.getConnectionStatus();

    res.json({
      date: today,
      count: usage.imagesGenerated,
      limit: DAILY_IMAGE_LIMIT,
      remaining: Math.max(0, DAILY_IMAGE_LIMIT - usage.imagesGenerated),
      instagramUsername: process.env.INSTAGRAM_USERNAME,
      instagramConnected: connection.connected,
      instagramError: connection.error
    });
  });

  // ===== ENDPOINTS DE GESTIÓN DE PERFILES =====

  // Crear nuevo perfil
  app.post("/api/profiles", async (req, res) => {
    try {
      console.log("🔍 API: Recibiendo request para crear perfil:", JSON.stringify(req.body, null, 2));
      
      const profileData = req.body;
      
      // Validación básica
      if (!profileData || !profileData.identity || !profileData.identity.name) {
        console.error("❌ API: Datos inválidos - falta nombre");
        return res.status(400).json({ message: "Profile name is required" });
      }
      
      console.log("🔍 API: Llamando a ProfileService.createProfile");
      const result = await ProfileService.createProfile(profileData);
      
      console.log("🔍 API: Resultado de ProfileService:", result);
      
      if (!result.success) {
        console.error("❌ API: ProfileService retornó error:", result.error);
        return res.status(400).json({ message: result.error });
      }
      
      console.log("✅ API: Perfil creado exitosamente");
      res.status(201).json(result.data);
    } catch (error: any) {
      console.error("❌ API: Create profile error:", error);
      console.error("❌ API: Error stack:", error.stack);
      res.status(500).json({ message: error.message || "Failed to create profile" });
    }
  });

  // Obtener todos los perfiles
  app.get("/api/profiles", async (req, res) => {
    try {
      const result = await ProfileService.getAllProfiles();
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({
        profiles: result.data,
        total: result.total
      });
    } catch (error: any) {
      console.error("Get profiles error:", error);
      res.status(500).json({ message: error.message || "Failed to get profiles" });
    }
  });

  // Obtener perfil por ID
  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await ProfileService.getProfileById(id);
      
      if (!result.success) {
        return res.status(404).json({ message: result.error });
      }
      
      res.json(result.data);
    } catch (error: any) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: error.message || "Failed to get profile" });
    }
  });

  // Obtener perfil activo
  app.get("/api/profiles/active", async (req, res) => {
    try {
      const result = await ProfileService.getActiveProfile();
      
      if (!result.success) {
        return res.status(404).json({ message: result.error });
      }
      
      res.json(result.data);
    } catch (error: any) {
      console.error("Get active profile error:", error);
      res.status(500).json({ message: error.message || "Failed to get active profile" });
    }
  });

  // Actualizar perfil
  app.put("/api/profiles/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updateData = req.body;
      const result = await ProfileService.updateProfile(id, updateData);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json(result.data);
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: error.message || "Failed to update profile" });
    }
  });

  // Activar perfil (desactiva los demás)
  app.post("/api/profiles/:id/activate", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await ProfileService.activateProfile(id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json(result.data);
    } catch (error: any) {
      console.error("Activate profile error:", error);
      res.status(500).json({ message: error.message || "Failed to activate profile" });
    }
  });

  // Eliminar perfil
  app.delete("/api/profiles/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await ProfileService.deleteProfile(id);
      
      if (!result.success) {
        return res.status(404).json({ message: result.error });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete profile error:", error);
      res.status(500).json({ message: error.message || "Failed to delete profile" });
    }
  });

  // Delete
  app.delete(api.images.delete.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const image = await storage.getImage(id);
    if (!image) return res.status(404).json({ message: "Image not found" });

    // Optional: Delete file from disk
    // const filePath = path.join(process.cwd(), "client/public", image.imagePath);
    // if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await storage.deleteImage(id);
    res.status(204).send();
  });

  // Start background tasks (except Instagram)
  startScheduler();

  // Start Instagram connection last after everything else is ready
  setTimeout(async () => {
    try {
      console.log("🔄 Starting Instagram connection after server initialization...");
      const { InstagramService } = await import("./services/instagram");
      await InstagramService.testConnection();
    } catch (error) {
      console.error("Failed to start Instagram connection loop:", error);
    }
  }, 3000); // 3 second delay

  return httpServer;
}
