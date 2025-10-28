/**
 * Server Manager - Orchestrates Fastify HTTP server with WebSocket support
 * Functional API for server management
 */

import dotenv from "dotenv";
import "async-array-utils";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin, CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { User, users } from "./db/schema";
import { catchErrors } from "./utils/catchErrors";
import type { DbTransaction } from "./db/utils";

dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

export type Context = {
  user?: User;
  token?: string;
  globalTx?: DbTransaction;
};

// ============================================================================
// MODULE STATE
// ============================================================================

let app: FastifyInstance;
let appRouter: any;
let allowedOrigins: string[];

const JWT_SECRET = process.env.JWT_SECRET as string;

// ============================================================================
// TRPC SETUP
// ============================================================================

const t = initTRPC
  .context<{
    token?: string;
    user?: User;
  }>()
  .create({
    errorFormatter: ({ shape, error }) => {
      return {
        ...shape,
        data: {
          ...shape.data,
          success: false,
          message: error.message,
        },
      };
    },
  });

const tTx = initTRPC
  .context<{
    token?: string;
    user?: User;
    globalTx: DbTransaction;
  }>()
  .create({
    errorFormatter: ({ shape, error }) => {
      return {
        ...shape,
        data: {
          ...shape.data,
          success: false,
          message: error.message,
        },
      };
    },
  });

export const router = t.router;
export const publicProcedure = t.procedure;

// ============================================================================
// AUTHENTICATION
// ============================================================================

const createContext = async ({ req }: CreateFastifyContextOptions) => {
  const authHeader = req.headers.authorization as string | undefined;
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token && typeof req.query === "object") {
    token = (req.query as { token?: string }).token;
  }

  return { token };
};

async function authenticate(token?: string) {
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No token provided" });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; username?: string };
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
  }

  const userId = decoded.userId;
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  return { decoded, user };
}

// ============================================================================
// MIDDLEWARES
// ============================================================================

const withAuth = t.middleware(async ({ ctx, next }) => {
  const { user } = await authenticate(ctx.token);
  return next({ ctx: { ...ctx, user } });
});

const withAuthTx = tTx.middleware(async ({ ctx, next }) => {
  const { user } = await authenticate(ctx.token);
  return next({ ctx: { ...ctx, user } });
});

const withTransaction = tTx.middleware(async ({ ctx, next }) => {
  return await catchErrors(async (globalTx: DbTransaction) => {
    return await next({ ctx: { ...ctx, globalTx } });
  });
});

// ============================================================================
// PROCEDURES
// ============================================================================

export const protectedProcedure = t.procedure.use(withAuth);

export const protectedProcedureGlobalTransaction = tTx.procedure.use(withAuthTx).use(withTransaction);

export const publicProcedureGlobalTransaction = tTx.procedure.use(withTransaction);

export const ping = publicProcedure
  .input(z.void())
  .output(z.object({ message: z.string() }))
  .query(() => ({ message: "pong from server" }));

export const giveMeRandomNumber = publicProcedure
  .input(z.void())
  .output(z.object({ number: z.number() }))
  .query(() => ({ number: Math.floor(Math.random() * 100) }));

// ============================================================================
// EXPORTS
// ============================================================================

export { z, TRPCError, withAuth as authMiddleware, t as tRPC, JWT_SECRET, app };
export type { AppRouter } from "./trpc/router";

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

function getAllowedOrigins(): string[] {
  return ["http://localhost:5173", process.env.FRONTEND_URL].filter((origin): origin is string =>
    Boolean(origin)
  );
}

async function setupMiddleware(): Promise<void> {
  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  });
}

async function setupRoutes(): Promise<void> {
  app.get("/health", async () => ({
    status: "OK",
    timestamp: new Date().toISOString(),
  }));

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: createContext,
      onError({ path, error }: any) {
        console.error(`tRPC error on path '${path}':`, error);
      },
    },
  });

  app.setErrorHandler((error: any, _req: any, reply: any) => {
    console.error("Fastify error:", error);
    reply.status(500).send({ error: "Internal server error" });
  });
}

function initialize(): void {
  allowedOrigins = getAllowedOrigins();
  app = Fastify({
    logger: false,
    routerOptions: {
      maxParamLength: 5000,
    },
  });
  setupMiddleware();
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function setRouter(router: any): Promise<void> {
  appRouter = router;
  await setupRoutes();
}

export async function setupTRPCRouter(): Promise<void> {
  const { appRouter: routerModule } = require("./trpc/router");
  await setRouter(routerModule);
}

export async function addRoute(path: string, handler: any): Promise<void> {
  await app.register(handler, { prefix: path });
}

export async function start(port: number = 4000): Promise<void> {
  if (!app) initialize();

  try {
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server started successfully on port ${port}`);
    console.log(`📍 Allowed origins:`, allowedOrigins);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

export async function close(): Promise<void> {
  await app.close();
}

// ============================================================================
// INITIALIZE
// ============================================================================

initialize();

const PORT = Number(process.env.PORT) || 4000;

(async () => {
  await setupTRPCRouter();
  await start(PORT);
})();
