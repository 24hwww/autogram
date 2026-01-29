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

const { Pool } = pg;

let db: any;
let pool: any = null;

// Try to use PostgreSQL first, fallback to SQLite
async function initializeDatabase() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
    try {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      // Test PostgreSQL connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      db = drizzlePg(pool, { schema: { ...schema, ...chatSchema } });
      console.log('✅ Using PostgreSQL database');
      return;
    } catch (error) {
      console.warn('⚠️ PostgreSQL connection failed, falling back to SQLite:', error instanceof Error ? error.message : error);
      pool = null;
      db = null;
    }
  }

  // Fallback to SQLite
  const dataDir = join(__dirname, '../data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(join(dataDir, 'autogram.db'));
  sqlite.pragma('foreign_keys = ON');
  db = drizzleSqlite(sqlite, { schema: { ...schema, ...chatSchema } });
  console.log('✅ Using SQLite database (local file)');
}

// Initialize database immediately
(async () => {
  await initializeDatabase();
})();

export { db, pool };
