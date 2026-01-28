import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateImage } from "./replit_integrations/image/client";
import path from "path";
import fs from "fs";
import express from "express";
import { DAILY_IMAGE_LIMIT } from "@shared/schema";
import { startScheduler } from "./scheduler";
import { publishToInstagram } from "./instagram";

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

  // List Images
  app.get(api.images.list.path, async (req, res) => {
    const images = await storage.getImages();
    res.json(images);
  });

  // Get Image
  app.get(api.images.get.path, async (req, res) => {
    const image = await storage.getImage(Number(req.params.id));
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.json(image);
  });

  // Generate Image
  app.post(api.images.generate.path, async (req, res) => {
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
      // Note: generateImage returns a base64 string
      const base64DataUrl = await generateImage(input.prompt + " instagram style, high quality, square aspect ratio");
      
      // 4. Save Image to Disk
      const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${crypto.randomUUID()}.png`;
      const filePath = path.join(storageDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      const publicPath = `/generated_images/${filename}`;

      // 5. Create DB Record
      const status = input.autoSchedule ? 'scheduled' : 'pending';
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
      });

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

  // Publish Manually
  app.post(api.images.publish.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const image = await storage.getImage(id);
      if (!image) return res.status(404).json({ message: "Image not found" });

      // Attempt publish
      const result = await publishToInstagram(image);
      
      const updated = await storage.updateImage(id, {
        status: result.success ? 'published' : 'failed',
        publishedAt: result.success ? new Date() : undefined,
        instagramMediaId: result.mediaId,
        error: result.error
      });
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Schedule
  app.post(api.images.schedule.path, async (req, res) => {
    const id = Number(req.params.id);
    const { scheduledAt } = api.images.schedule.input.parse(req.body);
    
    const image = await storage.getImage(id);
    if (!image) return res.status(404).json({ message: "Image not found" });

    const updated = await storage.updateImage(id, {
      status: 'scheduled',
      scheduledAt: new Date(scheduledAt)
    });

    res.json(updated);
  });

  // Get Limits
  app.get(api.limits.get.path, async (req, res) => {
    const today = getTodayDate();
    const usage = await storage.getUsageLimit(today);
    
    res.json({
      date: today,
      count: usage.imagesGenerated,
      limit: DAILY_IMAGE_LIMIT,
      remaining: Math.max(0, DAILY_IMAGE_LIMIT - usage.imagesGenerated)
    });
  });

  // Delete
  app.delete(api.images.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const image = await storage.getImage(id);
    if (!image) return res.status(404).json({ message: "Image not found" });
    
    // Optional: Delete file from disk
    // const filePath = path.join(process.cwd(), "client/public", image.imagePath);
    // if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await storage.deleteImage(id);
    res.status(204).send();
  });

  // Start the background scheduler
  startScheduler();

  return httpServer;
}
