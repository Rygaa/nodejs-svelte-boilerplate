import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

// Socket list to track connections with user information
interface SocketConnection {
  sockets: Array<{
    socket: WebSocket;
    ipAddress: string;
  }>;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

export const socketList: SocketConnection[] = [];

// Helper function to get active users
export function getActiveUsers() {
  return socketList
    .filter((connection) => connection.user)
    .map((connection) => connection.user!);
}

// Helper function to get connection count
export function getConnectionStats() {
  const totalSockets = socketList.reduce((acc, conn) => acc + conn.sockets.length, 0);
  const authenticated = socketList.filter(conn => conn.user).length;
  const anonymous = socketList.filter(conn => !conn.user).length;
  
  return {
    totalSockets,
    totalConnections: socketList.length,
    authenticated,
    anonymous,
  };
}

export async function setupWebSocketServer(app: FastifyInstance, appRouter: any) {
  console.log("🔄 Setting up WebSocket server...");

  // Register WebSocket route handler
  app.get("/ws", { websocket: true }, async (socket, req) => {
    console.log(`➕➕ WebSocket connection (total clients: ${app.websocketServer?.clients.size || 0})`);
    
    // Get REAL IP address from Cloudflare headers (if behind Cloudflare)
    let ipAddress = 
      req.headers['cf-connecting-ip'] as string || // Cloudflare real IP
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.socket.remoteAddress ||
      'unknown';
    
    // Handle multiple IPs in x-forwarded-for (take the first one)
    if (ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }
    
    // Convert IPv6 localhost to IPv4 for consistency
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
      ipAddress = '127.0.0.1';
    }
    
    // Remove IPv6 prefix if present
    if (ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.substring(7);
    }
    
    // Add socket to the list on handshake
    socketList.push({
      sockets: [{
        socket: socket,
        ipAddress: ipAddress,
      }],
      user: undefined,
    });
    console.log(`📋 Socket added to list. Total tracked: ${socketList.length}`);

    // Extract token from query parameters
    const query = req.query as { token?: string };
    const token = query?.token;
    
    console.log(`🔑 Token present: ${!!token}, IP: ${ipAddress}`);
    
    // Authenticate immediately if token is provided
    if (token) {
      await authenticateSocket(socket, token);
    } else {
      console.log(`⚠️ No token provided for connection from ${ipAddress}`);
    }

    // Handle authentication via message (fallback method)
    socket.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication message
        if (data.type === "AUTH" && data.token) {
          await authenticateSocket(socket, data.token);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });
    
    socket.on("close", () => {
      console.log(`➖➖ WebSocket connection closed (total clients: ${app.websocketServer?.clients.size || 0})`);
      
      // Remove socket from the list on close
      const connectionIndex = socketList.findIndex(conn => 
        conn.sockets.some(s => s.socket === socket)
      );
      
      if (connectionIndex !== -1) {
        const connection = socketList[connectionIndex];
        if (connection.user) {
          console.log(`👋 User ${connection.user.email} disconnected`);
        }
        
        // Remove the specific socket from the connection
        connection.sockets = connection.sockets.filter(s => s.socket !== socket);
        
        // If no sockets left for this connection, remove the entire connection
        if (connection.sockets.length === 0) {
          socketList.splice(connectionIndex, 1);
        }
      }
      
      console.log(`📋 Socket removed from list. Total tracked: ${socketList.length}`);
    });
  });

  console.log("✅ WebSocket route registered at /ws");
}

// Helper function to authenticate a WebSocket connection
async function authenticateSocket(socket: WebSocket, token: string) {
  try {
    console.log(`🔐 Attempting to authenticate socket...`);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    
    if (!user) {
      console.log(`❌ User not found for token`);
      socket.send(JSON.stringify({
        type: 'AUTH_ERROR',
        message: 'User not found',
      }));
      return;
    }
    
    console.log(`✅ Token verified for user: ${user.email}`);
    
    // Find connection that contains this socket
    const currentConnection = socketList.find(conn => 
      conn.sockets.some(s => s.socket === socket)
    );
    
    if (currentConnection && !currentConnection.user) {
      // Check if this user is already connected from a different IP
      const existingUserConnection = socketList.find(conn => 
        conn.user?.id === user.id && conn !== currentConnection
      );
      
      if (existingUserConnection) {
        // Get the IP addresses
        const currentIP = currentConnection.sockets[0]?.ipAddress;
        const existingIPs = new Set(existingUserConnection.sockets.map(s => s.ipAddress));
        
        console.log(`🔍 User already has connection. Current IP: ${currentIP}, Existing IPs: ${Array.from(existingIPs).join(', ')}`);
        
        if (!existingIPs.has(currentIP)) {
          // Different IP detected
          console.log(`⚠️ User ${user.email} connecting from new IP ${currentIP}. Disconnecting old IPs: ${Array.from(existingIPs).join(', ')}`);
          
          // Send redirect message to old connection(s) and close them
          existingUserConnection.sockets.forEach(socketObj => {
            try {
              socketObj.socket.send(JSON.stringify({
                type: 'REDIRECT',
                url: '/error',
                reason: 'Connection from different IP detected',
              }));
              socketObj.socket.close(1008, 'New connection from different IP');
            } catch (error) {
              console.error('Error sending redirect:', error);
            }
          });
          
          // Remove the old connection from the list
          const index = socketList.indexOf(existingUserConnection);
          if (index > -1) {
            socketList.splice(index, 1);
            console.log(`🗑️ Removed old connection from list`);
          }
        } else {
          // Same IP, merge the sockets into the existing connection
          console.log(`🔗 Same IP detected, merging connections`);
          existingUserConnection.sockets.push(...currentConnection.sockets);
          const index = socketList.indexOf(currentConnection);
          if (index > -1) {
            socketList.splice(index, 1);
          }
          console.log(`🔐 Socket authenticated for user: ${user.email} (merged with existing connection)`);
          socket.send(JSON.stringify({
            type: 'AUTH_SUCCESS',
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
            }
          }));
          return;
        }
      }
      
      // Set user info on current connection
      currentConnection.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };
      console.log(`🔐 Socket authenticated for user: ${user.email}`);
      
      socket.send(JSON.stringify({
        type: 'AUTH_SUCCESS',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }
      }));
    }
    
    console.log(socketList.map(conn => ({
      user: conn.user?.email,
      ips: conn.sockets.map(s => s.ipAddress)
    })));
  } catch (error) {
    console.error('Error authenticating socket:', error);
    socket.send(JSON.stringify({
      type: 'AUTH_ERROR',
      message: 'Invalid token',
    }));
  }
}
