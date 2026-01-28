import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import * as chatSchema from "@shared/models/chat";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create SQLite database file in the server directory
const sqlite = new Database(join(__dirname, '../data/autogram.db'));

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema: { ...schema, ...chatSchema } });
export const pool = null; // For compatibility with existing code
