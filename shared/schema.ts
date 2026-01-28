import { pgTable, text as pgText, serial as pgSerial, integer as pgInteger, boolean as pgBoolean, timestamp as pgTimestamp, jsonb as pgJsonb } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Determine which database we're using
const useSqlite = !process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://');

// Define tables for both databases
export const images = useSqlite
  ? sqliteTable("images", {
    id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
    prompt: sqliteText("prompt").notNull(),
    caption: sqliteText("caption"),
    imagePath: sqliteText("image_path").notNull(),
    status: sqliteText("status", { enum: ['pending', 'scheduled', 'published', 'failed'] }).notNull().default('pending'),
    scheduledAt: sqliteInteger("scheduled_at", { mode: 'timestamp' }),
    instagramMediaId: sqliteText("instagram_media_id"),
    error: sqliteText("error"),
    createdAt: sqliteInteger("created_at", { mode: 'timestamp' }).$defaultFn(() => new Date()),
    publishedAt: sqliteInteger("published_at", { mode: 'timestamp' }),
    autoSchedule: sqliteInteger("auto_schedule", { mode: 'boolean' }).default(false),
    scheduleInterval: sqliteInteger("schedule_interval"),
    isCarousel: sqliteInteger("is_carousel", { mode: 'boolean' }).default(false),
    imagePaths: sqliteText("image_paths"), // JSON string for SQLite
  })
  : pgTable("images", {
    id: pgSerial("id").primaryKey(),
    prompt: pgText("prompt").notNull(),
    caption: pgText("caption"),
    imagePath: pgText("image_path").notNull(),
    status: pgText("status", { enum: ['pending', 'scheduled', 'published', 'failed'] }).notNull().default('pending'),
    scheduledAt: pgTimestamp("scheduled_at"),
    instagramMediaId: pgText("instagram_media_id"),
    error: pgText("error"),
    createdAt: pgTimestamp("created_at").defaultNow(),
    publishedAt: pgTimestamp("published_at"),
    autoSchedule: pgBoolean("auto_schedule").default(false),
    scheduleInterval: pgInteger("schedule_interval"),
    isCarousel: pgBoolean("is_carousel").default(false),
    imagePaths: pgText("image_paths").array(),
  });

export const usageLimits = useSqlite
  ? sqliteTable("usage_limits", {
    date: sqliteText("date").primaryKey(),
    imagesGenerated: sqliteInteger("images_generated").default(0).notNull(),
  })
  : pgTable("usage_limits", {
    date: pgText("date").primaryKey(),
    imagesGenerated: pgInteger("images_generated").default(0).notNull(),
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
