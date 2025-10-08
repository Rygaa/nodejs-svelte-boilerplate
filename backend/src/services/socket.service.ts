/**
 * Socket.IO Service - Handles all WebSocket connections and events
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { logger } from "./logger.service";
import { SocketHandlerRegistry } from "../socket/index.socket";

export class SocketService {
  private io: SocketIOServer;
  private handlerRegistry: SocketHandlerRegistry;

  constructor(server: HTTPServer, allowedOrigins: string[]) {
    this.handlerRegistry = new SocketHandlerRegistry();
    this.io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket): void {
    logger.info({
      message: `Client connected: ${socket.id}`,
      data: {
        socketId: socket.id,
        registeredEvents: this.handlerRegistry.getRegisteredEvents(),
      },
      source: "socket.service.ts",
    });

    // Register disconnect handler
    this.registerDisconnectHandler(socket);

    // Register all custom event handlers
    this.handlerRegistry.registerHandlers(socket);
  }

  private registerDisconnectHandler(socket: Socket): void {
    socket.on("disconnect", () => {
      logger.info({
        message: `Client disconnected: ${socket.id}`,
        source: "socket.service.ts",
      });
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public getHandlerRegistry(): SocketHandlerRegistry {
    return this.handlerRegistry;
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public broadcastToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  public getConnectedClientsCount(): number {
    return this.io.engine.clientsCount;
  }
}
