import { db as pgDb } from "../db";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import pg from "pg";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import * as chatSchema from "@shared/models/chat";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SyncDirection {
  from: 'postgres' | 'sqlite';
  to: 'postgres' | 'sqlite';
}

export class DatabaseSync {
  private static instance: DatabaseSync;
  private sqliteDb: Database.Database | null = null;
  private isInitialized = false;

  static getInstance(): DatabaseSync {
    if (!DatabaseSync.instance) {
      DatabaseSync.instance = new DatabaseSync();
    }
    return DatabaseSync.instance;
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

        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          direction TEXT,
          table_name TEXT,
          records_synced INTEGER,
          sync_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          error TEXT
        );
      `);

      this.isInitialized = true;
      console.log("✅ DatabaseSync: Initialized SQLite backup database");
    } catch (error) {
      console.error("❌ DatabaseSync: Failed to initialize:", error);
      throw error;
    }
  }

  private logSync(direction: string, tableName: string, recordsSynced: number, error?: string) {
    if (!this.sqliteDb) return;

    try {
      this.sqliteDb.prepare(`
        INSERT INTO sync_log (direction, table_name, records_synced, error)
        VALUES (?, ?, ?, ?)
      `).run(direction, tableName, recordsSynced, error || null);
    } catch (logError) {
      console.error("❌ DatabaseSync: Failed to log sync:", logError);
    }
  }

  async syncImagesToSqlite(): Promise<void> {
    if (!this.sqliteDb) {
      console.warn("⚠️ DatabaseSync: SQLite not initialized");
      return;
    }

    try {
      // Get all images from PostgreSQL
      const pgImages = await pgDb.select().from(images);
      
      let syncedCount = 0;
      const stmt = this.sqliteDb.prepare(`
        INSERT OR REPLACE INTO images (
          id, prompt, caption, image_path, status, scheduled_at,
          instagram_media_id, error, created_at, published_at,
          auto_schedule, schedule_interval, is_carousel, image_paths, last_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const image of pgImages) {
        stmt.run(
          image.id,
          image.prompt,
          image.caption,
          image.imagePath,
          image.status,
          image.scheduledAt?.toISOString(),
          image.instagramMediaId,
          image.error,
          image.createdAt?.toISOString(),
          image.publishedAt?.toISOString(),
          image.autoSchedule ? 1 : 0,
          image.scheduleInterval,
          image.isCarousel ? 1 : 0,
          JSON.stringify(image.imagePaths),
          new Date().toISOString()
        );
        syncedCount++;
      }

      this.logSync('postgres_to_sqlite', 'images', syncedCount);
      console.log(`✅ DatabaseSync: Synced ${syncedCount} images from PostgreSQL to SQLite`);
    } catch (error) {
      console.error("❌ DatabaseSync: Failed to sync images to SQLite:", error);
      this.logSync('postgres_to_sqlite', 'images', 0, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async syncImagesToPostgres(): Promise<void> {
    if (!this.sqliteDb) {
      console.warn("⚠️ DatabaseSync: SQLite not initialized");
      return;
    }

    try {
      // Get all images from SQLite
      const sqliteImages = this.sqliteDb.prepare("SELECT * FROM images").all() as any[];
      
      let syncedCount = 0;
      for (const image of sqliteImages) {
        const imageData = {
          id: image.id,
          prompt: image.prompt,
          caption: image.caption,
          imagePath: image.image_path,
          status: image.status,
          scheduledAt: image.scheduled_at ? new Date(image.scheduled_at) : null,
          instagramMediaId: image.instagram_media_id,
          error: image.error,
          createdAt: image.created_at ? new Date(image.created_at) : new Date(),
          publishedAt: image.published_at ? new Date(image.published_at) : null,
          autoSchedule: Boolean(image.auto_schedule),
          scheduleInterval: image.schedule_interval,
          isCarousel: Boolean(image.is_carousel),
          imagePaths: image.image_paths ? JSON.parse(image.image_paths) : null,
        };

        // Check if image exists in PostgreSQL
        const existing = await pgDb.select().from(images).where(eq(images.id, image.id)).limit(1);
        
        if (existing.length === 0) {
          // Insert new image
          await pgDb.insert(images).values(imageData);
        } else {
          // Update existing image if SQLite version is newer
          const sqliteLastSync = new Date(image.last_sync || image.created_at);
          const pgLastModified = existing[0].createdAt || new Date(0);
          
          if (sqliteLastSync > pgLastModified) {
            await pgDb.update(images)
              .set(imageData)
              .where(eq(images.id, image.id));
          }
        }
        syncedCount++;
      }

      this.logSync('sqlite_to_postgres', 'images', syncedCount);
      console.log(`✅ DatabaseSync: Synced ${syncedCount} images from SQLite to PostgreSQL`);
    } catch (error) {
      console.error("❌ DatabaseSync: Failed to sync images to PostgreSQL:", error);
      this.logSync('sqlite_to_postgres', 'images', 0, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async syncUsageLimitsToSqlite(): Promise<void> {
    if (!this.sqliteDb) {
      console.warn("⚠️ DatabaseSync: SQLite not initialized");
      return;
    }

    try {
      const pgLimits = await pgDb.select().from(usageLimits);
      
      let syncedCount = 0;
      const stmt = this.sqliteDb.prepare(`
        INSERT OR REPLACE INTO usage_limits (id, date, images_generated, last_sync)
        VALUES (?, ?, ?, ?)
      `);

      for (const limit of pgLimits) {
        stmt.run(
          limit.id,
          limit.date,
          limit.imagesGenerated,
          new Date().toISOString()
        );
        syncedCount++;
      }

      this.logSync('postgres_to_sqlite', 'usage_limits', syncedCount);
      console.log(`✅ DatabaseSync: Synced ${syncedCount} usage limits from PostgreSQL to SQLite`);
    } catch (error) {
      console.error("❌ DatabaseSync: Failed to sync usage limits to SQLite:", error);
      this.logSync('postgres_to_sqlite', 'usage_limits', 0, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async syncUsageLimitsToPostgres(): Promise<void> {
    if (!this.sqliteDb) {
      console.warn("⚠️ DatabaseSync: SQLite not initialized");
      return;
    }

    try {
      const sqliteLimits = this.sqliteDb.prepare("SELECT * FROM usage_limits").all() as any[];
      
      let syncedCount = 0;
      for (const limit of sqliteLimits) {
        const limitData = {
          id: limit.id,
          date: limit.date,
          imagesGenerated: limit.images_generated,
        };

        const existing = await pgDb.select().from(usageLimits).where(eq(usageLimits.id, limit.id)).limit(1);
        
        if (existing.length === 0) {
          await pgDb.insert(usageLimits).values(limitData);
        } else {
          const sqliteLastSync = new Date(limit.last_sync || new Date());
          const pgLastModified = existing[0].createdAt || new Date(0);
          
          if (sqliteLastSync > pgLastModified) {
            await pgDb.update(usageLimits)
              .set(limitData)
              .where(eq(usageLimits.id, limit.id));
          }
        }
        syncedCount++;
      }

      this.logSync('sqlite_to_postgres', 'usage_limits', syncedCount);
      console.log(`✅ DatabaseSync: Synced ${syncedCount} usage limits from SQLite to PostgreSQL`);
    } catch (error) {
      console.error("❌ DatabaseSync: Failed to sync usage limits to PostgreSQL:", error);
      this.logSync('sqlite_to_postgres', 'usage_limits', 0, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async bidirectionalSync(): Promise<void> {
    console.log("🔄 DatabaseSync: Starting bidirectional sync...");
    
    try {
      // Sync from PostgreSQL to SQLite
      await this.syncImagesToSqlite();
      await this.syncUsageLimitsToSqlite();
      
      // Sync from SQLite to PostgreSQL
      await this.syncImagesToPostgres();
      await this.syncUsageLimitsToPostgres();
      
      console.log("✅ DatabaseSync: Bidirectional sync completed successfully");
    } catch (error) {
      console.error("❌ DatabaseSync: Bidirectional sync failed:", error);
      throw error;
    }
  }

  async getSyncHistory(limit = 50): Promise<any[]> {
    if (!this.sqliteDb) return [];

    try {
      return this.sqliteDb.prepare(`
        SELECT * FROM sync_log 
        ORDER BY sync_time DESC 
        LIMIT ?
      `).all(limit);
    } catch (error) {
      console.error("❌ DatabaseSync: Failed to get sync history:", error);
      return [];
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
