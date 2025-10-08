import fs from "fs";
import path from "path";
import { Socket } from "socket.io";

/**
 * Socket event handler function type
 */
export type SocketEventHandler = (socket: Socket, data: any) => void | Promise<void>;

/**
 * Socket event handler configuration
 */
export interface SocketEventConfig {
  eventName: string;
  handler: SocketEventHandler;
}

/**
 * Helper function to create a socket event configuration
 */
export function createSocketHandler(eventName: string, handler: SocketEventHandler): SocketEventConfig {
  return { eventName, handler };
}

export class SocketHandlerRegistry {
  private handlers: SocketEventConfig[] = [];

  constructor() {
    this.loadHandlers();
  }

  private async loadHandlers() {
    const handlersDir = path.join(__dirname, "handlers");
    const files = fs
      .readdirSync(handlersDir)
      .filter((f) => f.endsWith(".handler.js") || f.endsWith(".handler.ts"));

    for (const file of files) {
      const eventName = file.replace(".handler.js", "").replace(".handler.ts", "");
      const module = await import(path.join(handlersDir, file));
      const handlerFn = module.default;
      if (typeof handlerFn === "function") {
        this.addHandler(createSocketHandler(eventName, handlerFn));
      }
    }
  }

  addHandler(handlerConfig: SocketEventConfig): void {
    this.handlers.push(handlerConfig);
  }

  registerHandlers(socket: Socket): void {
    this.handlers.forEach(({ eventName, handler }) => {
      socket.on(eventName, (data: any) => handler(socket, data));
    });
  }

  getRegisteredEvents(): string[] {
    return this.handlers.map(({ eventName }) => eventName);
  }
}
