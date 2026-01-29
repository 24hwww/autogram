import { DatabaseStorage } from "./storage";
import { DatabaseSync } from "../db/sync";
import { ImageModel, UsageLimit } from "@shared/schema";
import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BackupStorage {
  private static instance: BackupStorage;
  private sqliteDb: Database.Database | null = null;
  private isInitialized = false;

  static getInstance(): BackupStorage {
    if (!BackupStorage.instance) {
      BackupStorage.instance = new BackupStorage();
    }
    return BackupStorage.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize SQLite as backup
      const dataDir = join(__dirname, '../../data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      const sqlitePath = join(dataDir, 'backup.db');
      this.sqliteDb = new Database(sqlitePath);
      
      // Create tables if they don't exist
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prompt TEXT,
          caption TEXT,
          image_path TEXT,
          status TEXT,
          scheduled_at DATETIME,
          instagram_media_id TEXT,
          error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          published_at DATETIME,
          auto_schedule BOOLEAN DEFAULT FALSE,
          schedule_interval INTEGER,
          is_carousel BOOLEAN DEFAULT FALSE,
          image_paths TEXT,
          last_sync DATETIME
        );

        CREATE TABLE IF NOT EXISTS usage_limits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE,
          images_generated INTEGER DEFAULT 0,
          last_sync DATETIME
        );
      `);

      this.isInitialized = true;
      console.log("✅ BackupStorage: Initialized SQLite backup database");
    } catch (error) {
      console.error("❌ BackupStorage: Failed to initialize:", error);
      throw error;
    }
  }

  async createImage(imageData: Omit<ImageModel, 'id'>): Promise<ImageModel> {
    if (!this.sqliteDb) {
      throw new Error("BackupStorage: SQLite not initialized");
    }

    try {
      const stmt = this.sqliteDb.prepare(`
        INSERT INTO images (
          prompt, caption, image_path, status, scheduled_at,
          instagram_media_id, error, created_at, published_at,
          auto_schedule, schedule_interval, is_carousel, image_paths, last_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        imageData.prompt,
        imageData.caption,
        imageData.imagePath,
        imageData.status,
        imageData.scheduledAt?.toISOString(),
        imageData.instagramMediaId,
        imageData.error,
        imageData.createdAt?.toISOString(),
        imageData.publishedAt?.toISOString(),
        imageData.autoSchedule ? 1 : 0,
        imageData.scheduleInterval,
        imageData.isCarousel ? 1 : 0,
        JSON.stringify(imageData.imagePaths),
        new Date().toISOString()
      );

      return {
        ...imageData,
        id: result.lastInsertRowid as number,
      };
    } catch (error) {
      console.error("❌ BackupStorage: Failed to create image:", error);
      throw error;
    }
  }

  async getImage(id: number): Promise<ImageModel | undefined> {
    if (!this.sqliteDb) {
      throw new Error("BackupStorage: SQLite not initialized");
    }

    try {
      const stmt = this.sqliteDb.prepare("SELECT * FROM images WHERE id = ?");
      const row = stmt.get(id) as any;
      
      if (!row) return undefined;

      return {
        id: row.id,
        prompt: row.prompt,
        caption: row.caption,
        imagePath: row.image_path,
        status: row.status,
        scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
        instagramMediaId: row.instagram_media_id,
        error: row.error,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        publishedAt: row.published_at ? new Date(row.published_at) : undefined,
        autoSchedule: Boolean(row.auto_schedule),
        scheduleInterval: row.schedule_interval,
        isCarousel: Boolean(row.is_carousel),
        imagePaths: row.image_paths ? JSON.parse(row.image_paths) : null,
      };
    } catch (error) {
      console.error("❌ BackupStorage: Failed to get image:", error);
      throw error;
    }
  }

  async getAllImages(): Promise<ImageModel[]> {
    if (!this.sqliteDb) {
      throw new Error("BackupStorage: SQLite not initialized");
    }

    try {
      const stmt = this.sqliteDb.prepare("SELECT * FROM images ORDER BY created_at DESC");
      const rows = stmt.all() as any[];
      
      return rows.map(row => ({
        id: row.id,
        prompt: row.prompt,
        caption: row.caption,
        imagePath: row.image_path,
        status: row.status,
        scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
        instagramMediaId: row.instagram_media_id,
        error: row.error,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        publishedAt: row.published_at ? new Date(row.published_at) : undefined,
        autoSchedule: Boolean(row.auto_schedule),
        scheduleInterval: row.schedule_interval,
        isCarousel: Boolean(row.is_carousel),
        imagePaths: row.image_paths ? JSON.parse(row.image_paths) : null,
      }));
    } catch (error) {
      console.error("❌ BackupStorage: Failed to get all images:", error);
      throw error;
    }
  }

  async updateImage(id: number, updates: Partial<ImageModel>): Promise<ImageModel> {
    if (!this.sqliteDb) {
      throw new Error("BackupStorage: SQLite not initialized");
    }

    try {
      const existing = await this.getImage(id);
      if (!existing) {
        throw new Error(`Image with id ${id} not found`);
      }

      const updated = { ...existing, ...updates };
      
      const stmt = this.sqliteDb.prepare(`
        UPDATE images SET
          prompt = ?, caption = ?, image_path = ?, status = ?, scheduled_at = ?,
          instagram_media_id = ?, error = ?, created_at = ?, published_at = ?,
          auto_schedule = ?, schedule_interval = ?, is_carousel = ?, image_paths = ?, last_sync = ?
        WHERE id = ?
      `);

      stmt.run(
        updated.prompt,
        updated.caption,
        updated.imagePath,
        updated.status,
        updated.scheduledAt?.toISOString(),
        updated.instagramMediaId,
        updated.error,
        updated.createdAt?.toISOString(),
        updated.publishedAt?.toISOString(),
        updated.autoSchedule ? 1 : 0,
        updated.scheduleInterval,
        updated.isCarousel ? 1 : 0,
        JSON.stringify(updated.imagePaths),
        new Date().toISOString(),
        id
      );

      return updated;
    } catch (error) {
      console.error("❌ BackupStorage: Failed to update image:", error);
      throw error;
    }
  }

  async deleteImage(id: number): Promise<void> {
    if (!this.sqliteDb) {
      throw new Error("BackupStorage: SQLite not initialized");
    }

    try {
      const stmt = this.sqliteDb.prepare("DELETE FROM images WHERE id = ?");
      stmt.run(id);
    } catch (error) {
      console.error("❌ BackupStorage: Failed to delete image:", error);
      throw error;
    }
  }

  async getScheduledImagesToPublish(): Promise<ImageModel[]> {
    if (!this.sqliteDb) {
      throw new Error("BackupStorage: SQLite not initialized");
    }

    try {
      const stmt = this.sqliteDb.prepare(`
        SELECT * FROM images 
        WHERE status = 'scheduled' AND scheduled_at <= datetime('now')
        ORDER BY scheduled_at
      `);
      const rows = stmt.all() as any[];
      
      return rows.map(row => ({
        id: row.id,
        prompt: row.prompt,
        caption: row.caption,
        imagePath: row.image_path,
        status: row.status,
        scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
        instagramMediaId: row.instagram_media_id,
        error: row.error,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        publishedAt: row.published_at ? new Date(row.published_at) : undefined,
        autoSchedule: Boolean(row.auto_schedule),
        scheduleInterval: row.schedule_interval,
        isCarousel: Boolean(row.is_carousel),
        imagePaths: row.image_paths ? JSON.parse(row.image_paths) : null,
      }));
    } catch (error) {
      console.error("❌ BackupStorage: Failed to get scheduled images:", error);
      throw error;
    }
  }

  async getUsageLimit(date: string): Promise<UsageLimit> {
    if (!this.sqliteDb) {
      throw new Error("BackupStorage: SQLite not initialized");
    }

    try {
      const stmt = this.sqliteDb.prepare("SELECT * FROM usage_limits WHERE date = ?");
      const row = stmt.get(date) as any;
      
      if (!row) {
        // Create if not exists
        const createStmt = this.sqliteDb.prepare("INSERT INTO usage_limits (date, images_generated) VALUES (?, ?)");
        const result = createStmt.run(date, 0);
        return {
          id: result.lastInsertRowid as number,
          date,
          imagesGenerated: 0,
        };
      }

      return {
        id: row.id,
        date: row.date,
        imagesGenerated: row.images_generated,
      };
    } catch (error) {
      console.error("❌ BackupStorage: Failed to get usage limit:", error);
      throw error;
    }
  }

  async incrementUsageCount(date: string): Promise<UsageLimit> {
    if (!this.sqliteDb) {
      throw new Error("BackupStorage: SQLite not initialized");
    }

    try {
      const limit = await this.getUsageLimit(date);
      const stmt = this.sqliteDb.prepare(`
        UPDATE usage_limits SET images_generated = images_generated + 1 WHERE date = ?
      `);
      stmt.run(date);
      
      return {
        ...limit,
        imagesGenerated: limit.imagesGenerated + 1,
      };
    } catch (error) {
      console.error("❌ BackupStorage: Failed to increment usage count:", error);
      throw error;
    }
  }

  close(): void {
    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
    this.isInitialized = false;
  }
}
