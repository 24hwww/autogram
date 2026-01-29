import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupWs } from "./ws";

const app = express();
const httpServer = createServer(app);

setupWs(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/Sao_Paulo",
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // const { setupAuth } = await import("./auth");
  // setupAuth(app); // Comentado - no requerimos autenticación

  await registerRoutes(httpServer, app);

  // Initialize automation system
  setTimeout(async () => {
    try {
      console.log("🔄 Initializing automation system...");

      // Initialize retry queue
      const { RetryQueue } = await import("./automation/retryQueue");
      await RetryQueue.init();

      // Start auto-generation if enabled
      if (process.env.AUTO_GENERATION_ENABLED === 'true') {
        const interval = parseInt(process.env.AUTO_GENERATION_INTERVAL_MINUTES || '15', 10);
        console.log(`🚀 Auto-generation enabled with ${interval} minute interval`);

        // Run once immediately on startup
        const { Orchestrator } = await import("./automation/orchestrator");
        setTimeout(() => Orchestrator.generateAndPost(), 1000);

        setInterval(async () => {
          try {
            await Orchestrator.generateAndPost();
          } catch (error) {
            console.error("❌ Auto-generation failed:", error);
          }
        }, interval * 60 * 1000);
      } else {
        console.log("ℹ️ Auto-generation disabled (AUTO_GENERATION_ENABLED not set to 'true')");
      }

    } catch (error) {
      console.error("Failed to initialize automation system:", error);
    }
  }, 3000); // 3 second delay

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    // Use Vite for development with HMR
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on http://127.0.0.1:${port}`);
    },
  );
})();
