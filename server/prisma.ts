import { PrismaClient } from '@prisma/client';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

let baseDir: string;

// Handle both development (ES modules) and production (CJS)
if (typeof __dirname !== 'undefined') {
  baseDir = __dirname;
} else {
  // In production CJS environment, use process.cwd()
  baseDir = process.cwd();
}

// Global Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client with SQLite
const createPrismaClient = () => {
  // Ensure data directory exists
  const dataDir = join(baseDir, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: 'file:./data/autogram.db'
      }
    },
    log: ['error', 'warn']
  });
};

// Use global client to avoid multiple instances in development
const prisma = globalThis.__prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export { prisma };
