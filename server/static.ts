import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Always use process.cwd() for the project root
// This avoids conflicts with Prisma's globalThis.__dirname override
const baseDir = process.cwd();

export function serveStatic(app: Express) {
  const distPath = path.resolve(baseDir, "dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
