import { defineConfig } from "drizzle-kit";

const useSqlite = !process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://');

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: useSqlite ? "sqlite" : "postgresql",
  dbCredentials: useSqlite
    ? { url: './data/autogram.db' }
    : { url: process.env.DATABASE_URL! },
});
