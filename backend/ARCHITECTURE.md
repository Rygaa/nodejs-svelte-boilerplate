# Server Architecture - HTTP and Socket Separation

This project now uses a clean separation between HTTP and WebSocket logic through dedicated services.

## Architecture Overview

```
index.ts (entry point)
    ↓
ServerManager
    ├── HTTPService (Express.js routes & middleware)
    └── TRPCWebSocketService (tRPC WebSocket subscriptions)
```

## Services

### 1. ServerManager (`src/services/server.service.ts`)

- **Purpose**: Orchestrates the entire server startup process
- **Responsibilities**:
  - Creates and configures HTTP and Socket services
  - Manages server lifecycle (start, stop)
  - Handles database setup
  - Initializes logging

### 2. HTTPService (`src/services/http.service.ts`)

- **Purpose**: Handles all HTTP-related functionality
- **Responsibilities**:
  - Express.js app configuration
  - CORS setup
  - Route management (health check, tRPC)
  - Middleware configuration
  - Error handling

### 3. TRPCWebSocketService (`src/services/trpc-ws.service.ts`)

- **Purpose**: Manages WebSocket connections using tRPC subscriptions
- **Responsibilities**:
  - tRPC WebSocket server configuration
  - Connection/disconnection handling
  - Type-safe subscription management
  - Real-time event broadcasting
  - Client connection tracking

## Optional: Custom Socket Handlers

### SocketEventHandlers (`src/socket/socket-handlers.ts`)

- **Purpose**: Demonstrates how to organize custom socket events
- **Features**:
  - Chat functionality (join/leave rooms, send messages)
  - Notification subscriptions
  - Real-time data updates
  - Modular handler organization

## Usage Examples

### Starting the Server

```typescript
// Simple startup (current implementation)
const serverManager = new ServerManager();
serverManager.start(4000);
```

### Adding Custom HTTP Routes

```typescript
const serverManager = new ServerManager();
const httpService = serverManager.getHTTPService();
httpService.addRoute("/api/custom", customRouter);
```

### Broadcasting Socket Messages

```typescript
const serverManager = new ServerManager();
const wsService = serverManager.getWebSocketService();

// Broadcast to all connected WebSocket clients
wsService.broadcastToAll({ message: "Server update" });

// Send events via tRPC WebSocket subscriptions
import { emitNotification, emitLog } from "./src/trpc/ws.router";
emitNotification("New message", "info", "user123");
emitLog({ level: "INFO", message: "Something happened" });
```

### Using Custom Socket Handlers

1. Uncomment the import in `socket.service.ts`:

   ```typescript
   import { SocketEventHandlers } from "../socket/socket-handlers";
   ```

2. Enable handlers in the `registerCustomEventHandlers` method:
   ```typescript
   SocketEventHandlers.registerChatHandlers(socket);
   SocketEventHandlers.registerNotificationHandlers(socket);
   SocketEventHandlers.registerDataHandlers(socket);
   ```

## Benefits

### 🔒 **Separation of Concerns**

- HTTP logic is completely separated from WebSocket logic
- Each service has a single, clear responsibility
- Easy to maintain and debug

### 🧪 **Testability**

- Services can be unit tested independently
- Mock dependencies easily
- Test HTTP routes without WebSocket complexity

### 📈 **Scalability**

- Easy to add new HTTP routes or Socket events
- Services can be extracted to microservices later
- Clear extension points for new functionality

### 🔧 **Maintainability**

- Changes to HTTP logic don't affect WebSocket logic
- Clear code organization
- Easy onboarding for new developers

### 🎯 **Type Safety**

- Full TypeScript support
- Clear interfaces and method signatures
- Compile-time error checking

## Migration Notes

This refactor maintains 100% backward compatibility:

- All existing HTTP routes work unchanged
- Socket.IO functionality is identical
- Logger integration remains the same
- No breaking changes to the API

## Next Steps

Consider implementing:

1. **Environment-specific configurations**
2. **Health check endpoints for services**
3. **Graceful shutdown handling**
4. **Metrics and monitoring**
5. **Rate limiting for socket events**
