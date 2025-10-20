/**
 * HTTP Service - Handles all Express.js HTTP routes and middleware
 */

import express, { Application } from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

export class HTTPService {
  private app: Application;
  private appRouter: any; // Will be set when router is imported

  // JWT Secret - from environment variable
  private readonly JWT_SECRET = process.env.JWT_SECRET;

  // Create tRPC context type
  private readonly Context = {} as {
    user?: {
      userId: string;
      email: string;
      username: string;
    };
    token?: string;
    prisma?: any; // Will be injected by the backend
  };

  // tRPC instance - private to this class
  private readonly t = initTRPC.context<typeof this.Context>().create({
    errorFormatter: ({ shape }) => shape,
  });

  // tRPC components
  private readonly router = this.t.router;
  private readonly publicProcedure = this.t.procedure;

  // Context creator function for Express adapter
  private createContext = ({ req, prisma }: { req: any; prisma?: any }): typeof this.Context => {
    // Extract token from Authorization header
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

    return {
      token,
      prisma,
    };
  };

  // Middleware to verify JWT token
  private authMiddleware = this.t.middleware(async ({ ctx, next }) => {
    const token = ctx.token;

    if (!token) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No token provided",
      });
    }

    try {
      // Import jwt dynamically to avoid issues when shared package is used on frontend
      const jwt = await import("jsonwebtoken");
      if (!this.JWT_SECRET) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "JWT_SECRET environment variable is required",
        });
      }
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        userId: string;
        email: string;
        username: string;
      };

      return next({
        ctx: {
          ...ctx,
          user: decoded,
        },
      });
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid token",
      });
    }
  });

  // Protected procedure using the class method
  private protectedProcedure = this.t.procedure.use(this.authMiddleware);

  // Ping procedure for health checking
  private ping = this.publicProcedure
    .input(z.object({}))
    .output(z.object({ message: z.string() }))
    .query(() => {
      return { message: "pong from server" };
    });

  // Public getters for external access
  public getRouter() {
    return this.router;
  }
  public getPublicProcedure() {
    return this.publicProcedure;
  }
  public getProtectedProcedure() {
    return this.protectedProcedure;
  }
  public getPing() {
    return this.ping;
  }
  public getAuthMiddleware() {
    return this.authMiddleware;
  }
  public getTRPC() {
    return this.t;
  }
  public getZ() {
    return z;
  }
  public getTRPCError() {
    return TRPCError;
  }
  public getJWTSecret() {
    if (!this.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    return this.JWT_SECRET;
  }

  constructor(allowedOrigins: string[]) {
    this.app = express();
    this.setupMiddleware(allowedOrigins);
    this.setupErrorHandling();
  }

  // Method to set the router after creation to avoid circular dependency
  public setRouter(appRouter: any): void {
    this.appRouter = appRouter;
    this.setupRoutes();
  }

  private setupMiddleware(allowedOrigins: string[]): void {
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl requests)
          if (!origin) return callback(null, true);

          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
      })
    );

    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({ status: "OK", timestamp: new Date().toISOString() });
    });

    // tRPC middleware
    this.app.use(
      "/trpc",
      createExpressMiddleware({
        router: this.appRouter,
        createContext: this.createContext,
      })
    );

    // OpenAPI REST endpoints - temporarily disabled for testing
    // this.app.use(
    //   "/api",
    //   createOpenApiExpressMiddleware({
    //     router: this.appRouter,
    //     createContext: this.createContext,
    //   })
    // );
  }

  private setupErrorHandling(): void {
    this.app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({ error: "Internal server error" });
    });
  }

  public getApp(): Application {
    return this.app;
  }

  public addRoute(path: string, router: any): void {
    this.app.use(path, router);
  }

  public addMiddleware(middleware: any): void {
    this.app.use(middleware);
  }
}
