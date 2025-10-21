/**
 * tRPC WebSocket Service - Handles WebSocket connections using tRPC subscriptions
 */

import { WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { logger } from './logger.service';

export class TRPCWebSocketService {
  private wss: WebSocketServer;
  private wssHandler: any;
  private connectedClients: Set<any> = new Set();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server });
    this.setupConnectionTracking();
  }

  public setupWithRouter(router: any): void {
    // Apply tRPC WebSocket handler
    this.wssHandler = applyWSSHandler({
      wss: this.wss,
      router,
      createContext: (opts: any) => {
        // Create context for WebSocket connections
        return {
          token: undefined, // Can be extracted from connection params if needed
          prisma: undefined,
        };
      },
      onError: ({ error }) => {
        logger.error({
          message: 'tRPC WebSocket error',
          data: {
            name: error.name,
            message: error.message,
          },
          source: 'trpc-ws.service.ts',
        });
      },
    });

    logger.info({
      message: 'tRPC WebSocket handler setup completed',
      source: 'trpc-ws.service.ts',
    });
  }

  private setupConnectionTracking(): void {
    this.wss.on('connection', (ws: any, request: any) => {
      this.connectedClients.add(ws);
      
      logger.info({
        message: 'tRPC WebSocket client connected',
        data: {
          clientCount: this.connectedClients.size,
          userAgent: request.headers['user-agent'],
          origin: request.headers.origin,
        },
        source: 'trpc-ws.service.ts',
      });

      ws.on('close', () => {
        this.connectedClients.delete(ws);
        logger.info({
          message: 'tRPC WebSocket client disconnected',
          data: {
            clientCount: this.connectedClients.size,
          },
          source: 'trpc-ws.service.ts',
        });
      });

      ws.on('error', (error: any) => {
        logger.error({
          message: 'tRPC WebSocket client error',
          data: {
            error: error.message,
            clientCount: this.connectedClients.size,
          },
          source: 'trpc-ws.service.ts',
        });
        this.connectedClients.delete(ws);
      });
    });
  }

  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  public getWebSocketServer(): WebSocketServer {
    return this.wss;
  }

  // Broadcast a message to all connected clients
  public broadcastToAll(data: any): void {
    const message = JSON.stringify(data);
    this.connectedClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
    
    logger.debug({
      message: 'Broadcasted message to all WebSocket clients',
      data: {
        clientCount: this.connectedClients.size,
        messagePreview: JSON.stringify(data).slice(0, 100),
      },
      source: 'trpc-ws.service.ts',
    });
  }

  // Close all connections (for graceful shutdown)
  public closeAllConnections(): void {
    this.connectedClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Server shutting down');
      }
    });
    this.wss.close();
    
    logger.info({
      message: 'All tRPC WebSocket connections closed',
      source: 'trpc-ws.service.ts',
    });
  }
}