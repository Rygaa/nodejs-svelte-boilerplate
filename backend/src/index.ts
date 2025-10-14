import dotenv from "dotenv";
import { extendAsyncArrayPrototypes } from "async-array-utils";
import { ServerManager } from "./services/server.service";
import { scriptManager } from "./services/scriptManager.service";

extendAsyncArrayPrototypes();
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

// Initialize script manager
async function initializeScriptManager() {
  try {
    await scriptManager.discoverScripts();
    await scriptManager.startAutoRun();
    console.log("✅ Script manager initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize script manager:", error);
  }
}

// Start server and initialize script manager
Promise.all([serverManager.start(PORT), initializeScriptManager()])
  .then(() => {
    console.log("🚀 Server and script manager are running");
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });
