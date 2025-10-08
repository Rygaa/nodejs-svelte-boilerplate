/**
 * Server Manager - Orchestrates HTTP and Socket.IO services
 */

import { createServer } from "http";
import { HTTPService } from "./http.service";
import { SocketService } from "./socket.service";
import { initLogger, logger } from "./logger.service";

export type Context = {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
  token?: string;
  prisma?: any;
};

export class ServerManager {
  private static instance: ServerManager;
  private httpService: HTTPService;
  private socketService: SocketService;
  private server: any;
  private allowedOrigins: string[];

  constructor() {
    this.allowedOrigins = this.getAllowedOrigins();
    this.httpService = new HTTPService(this.allowedOrigins);
    this.server = createServer(this.httpService.getApp());
    this.socketService = new SocketService(this.server, this.allowedOrigins);

    // Initialize logger with socket instance
    initLogger(this.socketService.getIO());
  }

  public static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  public setupTRPCRouter(): void {
    // Import and set the router after tRPC exports are available
    const { appRouter } = require("../trpc/router");
    this.httpService.setRouter(appRouter);
  }

  private getAllowedOrigins(): string[] {
    return [
      "http://localhost:5174", // Local development
      "https://agent.oasispath.ca", // Production frontend
      process.env.FRONTEND_URL, // Environment-specific URL
    ].filter((origin): origin is string => Boolean(origin));
  }

  // tRPC exports - moved from trpc.ts
  public getRouter() {
    return this.httpService.getRouter();
  }

  public getPublicProcedure() {
    return this.httpService.getPublicProcedure();
  }

  public getProtectedProcedure() {
    return this.httpService.getProtectedProcedure();
  }

  public getAuthMiddleware() {
    return this.httpService.getAuthMiddleware();
  }

  public getPing() {
    return this.httpService.getPing();
  }

  public getTRPC() {
    return this.httpService.getTRPC();
  }

  public getZ() {
    return this.httpService.getZ();
  }

  public getTRPCError() {
    return this.httpService.getTRPCError();
  }

  public getJWTSecret() {
    return this.httpService.getJWTSecret();
  }

  public async start(port: number = 4000): Promise<void> {
    try {
      // Test for API key (keeping your existing logic)
      if (process.env.HUNTER_API_KEY) {
        // Hunter API Key is loaded
      } else {
        // HUNTER_API_KEY not found in environment variables
      }

      this.server.listen(port, () => {
        logger.success({
          message: `Server started successfully on port ${port} with real-time logging`,
          data: {
            port,
            allowedOrigins: this.allowedOrigins,
            connectedClients: this.socketService.getConnectedClientsCount(),
          },
          source: "server.service.ts",
        });
      });
    } catch (error) {
      logger.error({
        message: "Failed to start server",
        data: error,
        source: "server.service.ts",
      });
      process.exit(1);
    }
  }

  public getSocketService(): SocketService {
    return this.socketService;
  }

  public getHTTPService(): HTTPService {
    return this.httpService;
  }

  public getServer(): any {
    return this.server;
  }
}
