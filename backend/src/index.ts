import dotenv from "dotenv";
import { ServerManager } from "./services/server.service";
import "async-array-utils";

// Load environment variables
dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

// Create and export the singleton instance
export const serverManager = ServerManager.getInstance();

// Export tRPC components for other files to use
export const router = serverManager.getRouter();
export const publicProcedure = serverManager.getPublicProcedure();
export const protectedProcedure = serverManager.getProtectedProcedure();
export const authMiddleware = serverManager.getAuthMiddleware();
export const ping = serverManager.getPing();
export const t = serverManager.getTRPC();
export const z = serverManager.getZ();
export const TRPCError = serverManager.getTRPCError();
export const JWT_SECRET = serverManager.getJWTSecret();

// Setup the tRPC router after ServerManager is created
serverManager.setupTRPCRouter();

// Start server
serverManager.start(PORT);
