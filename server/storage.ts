import { db } from "./db";
import { 
  images, usageLimits,
  type ImageModel, type InsertImage, 
  type UsageLimit, 
  DAILY_IMAGE_LIMIT 
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // Images
  getImages(): Promise<ImageModel[]>;
  getImage(id: number): Promise<ImageModel | undefined>;
  createImage(image: InsertImage): Promise<ImageModel>;
  updateImage(id: number, updates: Partial<ImageModel>): Promise<ImageModel>;
  deleteImage(id: number): Promise<void>;
  
  // Scheduler
  getScheduledImagesToPublish(): Promise<ImageModel[]>;
  
  // Usage Limits
  getUsageLimit(date: string): Promise<UsageLimit>;
  incrementUsageCount(date: string): Promise<UsageLimit>;
}

export class DatabaseStorage implements IStorage {
  async getImages(): Promise<ImageModel[]> {
    return await db.select().from(images).orderBy(sql`${images.createdAt} DESC`);
  }

  async getImage(id: number): Promise<ImageModel | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async createImage(insertImage: InsertImage): Promise<ImageModel> {
    const [image] = await db.insert(images).values(insertImage).returning();
    return image;
  }

  async updateImage(id: number, updates: Partial<ImageModel>): Promise<ImageModel> {
    const [updated] = await db.update(images)
      .set(updates)
      .where(eq(images.id, id))
      .returning();
    return updated;
  }

  async deleteImage(id: number): Promise<void> {
    await db.delete(images).where(eq(images.id, id));
  }

  async getScheduledImagesToPublish(): Promise<ImageModel[]> {
    try {
      // Find images with status 'scheduled' and scheduledAt <= now
      // Use compatible SQL for both PostgreSQL and SQLite
      const now = new Date().toISOString();
      return await db.select().from(images)
        .where(sql`${images.status} = 'scheduled' AND ${images.scheduledAt} <= ${now}`);
    } catch (error) {
      console.warn("⚠️ Database query failed in getScheduledImagesToPublish:", error);
      return [];
    }
  }

  async getUsageLimit(date: string): Promise<UsageLimit> {
    const [limit] = await db.select().from(usageLimits).where(eq(usageLimits.date, date));
    if (!limit) {
      // Create if not exists
      const [newLimit] = await db.insert(usageLimits).values({ date, imagesGenerated: 0 }).returning();
      return newLimit;
    }
    return limit;
  }

  async incrementUsageCount(date: string): Promise<UsageLimit> {
    const limit = await this.getUsageLimit(date);
    const [updated] = await db.update(usageLimits)
      .set({ imagesGenerated: limit.imagesGenerated + 1 })
      .where(eq(usageLimits.date, date))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
