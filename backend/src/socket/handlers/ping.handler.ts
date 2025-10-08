import { Socket } from "socket.io";
import { logger } from "../../services/logger.service";

export default function handlePing(socket: Socket, data?: any): void {
  logger.debug({
    message: `Ping received from socket ${socket.id}`,
    data: { socketId: socket.id, pingData: data },
    source: "ping.handler.ts",
  });

  // Send pong response
  socket.emit("pong", {
    timestamp: new Date().toISOString(),
    message: "Hey",
    originalData: data,
  });
}

// Optional: Export metadata for dynamic discovery
export const metadata = {
  description: "Simple ping/pong handler for connection testing",
  version: "1.0.0",
  author: "Your Name",
  tags: ["utility", "connection", "test"],
};
