import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  caption: text("caption"),
  imagePath: text("image_path").notNull(),
  status: text("status", { enum: ['pending', 'scheduled', 'published', 'failed'] }).notNull().default('pending'),
  scheduledAt: timestamp("scheduled_at"),
  instagramMediaId: text("instagram_media_id"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  publishedAt: timestamp("published_at"),
  autoSchedule: boolean("auto_schedule").default(false),
});

export const usageLimits = pgTable("usage_limits", {
  date: text("date").primaryKey(), // YYYY-MM-DD
  imagesGenerated: integer("images_generated").default(0).notNull(),
});

// === BASE SCHEMAS ===
export const insertImageSchema = createInsertSchema(images).omit({ 
  id: true, 
  createdAt: true, 
  publishedAt: true, 
  status: true,
  error: true, 
  instagramMediaId: true,
  imagePath: true // Generated on server
});

export const insertUsageLimitSchema = createInsertSchema(usageLimits);

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type ImageModel = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type UsageLimit = typeof usageLimits.$inferSelect;

// Request types
export type GenerateImageRequest = {
  prompt: string;
  caption?: string;
  autoSchedule?: boolean;
  scheduleAt?: string; // ISO string
};

export type ScheduleImageRequest = {
  scheduledAt: string; // ISO string
};

// Response types
export type ImageResponse = ImageModel;
export type UsageLimitResponse = {
  date: string;
  count: number;
  limit: number;
  remaining: number;
};

// Constants
export const DAILY_IMAGE_LIMIT = 20;
