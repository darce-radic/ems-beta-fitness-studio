import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedAccounts } from "./seed-accounts";
import { seedScheduleData } from "./seed/schedule-data";
import { seedComprehensiveData } from "./seed/comprehensive-data";
import runAllMigrations from "../migrations/run-all-migrations";
import { validateEnvironment } from "./environment";
import { generalRateLimit, helmetConfig, apiRateLimit } from "./security";
import { performanceMonitor, errorTracker } from "./monitoring";

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Apply security middleware
app.use(helmetConfig);
app.use(generalRateLimit);
app.use(performanceMonitor);

// API-specific rate limiting
// Rate limiting disabled for deployment testing
// app.use('/api', apiRateLimit);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handler for production
app.use(errorTracker);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Graceful shutdown handling
let server: Server | undefined;

function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close((err: any) => {
      if (err) {
        console.error('Error during server close:', err);
        process.exit(1);
      }
      console.log('Server closed successfully');
      process.exit(0);
    });
    
    // Force exit after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
}

// Handle uncaught exceptions with graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

(async () => {
  // Validate environment variables first
  try {
    validateEnvironment();
    log("Environment variables validated successfully");
  } catch (error) {
    console.error("Environment validation failed:", error);
    process.exit(1);
  }

  // Run database migrations
  try {
    await runAllMigrations();
    log("Database migrations completed successfully");
  } catch (error) {
    console.error(`Error running migrations:`, error);
    process.exit(1);
  }
  
  // Seed default accounts
  try {
    await seedAccounts();
  } catch (error) {
    log(`Error seeding accounts: ${error}`);
  }
  
  // Seed basic business data first
  try {
    const { seedBasicBusinessData } = await import("./seed/basic-business-data");
    await seedBasicBusinessData();
    log("Basic business data seeded successfully");
  } catch (error) {
    log(`Error seeding basic business data: ${error}`);
  }

  // Skip reports data seeding for now - use existing booking data
  
  // Skip comprehensive seeding for now - focus on existing data structure
  // Will add business data seeding once schema is properly aligned

  server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
