# Socket Event Handlers - Simple Function Architecture

This directory contains a modular Socket.IO event handler system where **each file represents a single event listener as a simple function**. This approach provides maximum simplicity, better organization, and excellent testability.

## 🏗️ Architecture

```
src/socket/
├── base-handler.ts              # Base types and utilities
├── index.ts                     # Registry that manages all handlers
└── handlers/
    ├── ping.handler.ts          # handlePing() for 'ping' event
    ├── join-room.handler.ts     # handleJoinRoom() for 'join-room' event
    ├── leave-room.handler.ts    # handleLeaveRoom() for 'leave-room' event
    ├── chat-message.handler.ts  # handleChatMessage() for 'chat-message' event
    ├── subscribe-notifications.handler.ts # handleSubscribeNotifications()
    └── request-data.handler.ts  # handleRequestData() for 'request-data' event
```

## 📝 Core Concepts

### 1. **One File = One Function = One Event**

Each handler file exports a simple function:

- `ping.handler.ts` → `handlePing()` function → handles `'ping'` events
- `join-room.handler.ts` → `handleJoinRoom()` function → handles `'join-room'` events
- etc.

### 2. **Simple Function Signature**

All handlers follow this pattern:

```typescript
export function handleEventName(socket: Socket, data: any): void | Promise<void> {
  // Your event logic here
}
```

### 3. **Configuration Export**

Each handler also exports a configuration object:

```typescript
export const eventNameHandler = createSocketHandler("event-name", handleEventName);
```

### 4. **SocketHandlerRegistry**

Manages all handlers:

- Auto-registers handlers with sockets
- Simple array of configurations
- Easy to extend with new handlers

## 🚀 How to Add a New Event Handler

### Step 1: Create the Handler File

```typescript
// src/socket/handlers/my-event.handler.ts
import { Socket } from "socket.io";
import { logger } from "../../services/logger.service";
import { createSocketHandler } from "../base-handler";

export function handleMyEvent(socket: Socket, data: any): void {
  // Your event logic here
  logger.info({
    message: `Handling my-event from ${socket.id}`,
    data: { socketId: socket.id, eventData: data },
    source: "my-event.handler.ts",
  });

  // Send response if needed
  socket.emit("my-event-response", { success: true });
}

// Export the handler configuration
export const myEventHandler = createSocketHandler("my-event", handleMyEvent);
```

### Step 2: Register in Index

```typescript
// src/socket/index.ts
import { myEventHandler } from "./handlers/my-event.handler";

// Add to registerDefaultHandlers():
this.addHandler(myEventHandler);

// Add to exports:
export { myEventHandler };
export { handleMyEvent } from "./handlers/my-event.handler";
```

### Step 3: Done! 🎉

Your handler is now automatically registered with all new socket connections.

## 📋 Available Handlers

### **handlePing** (`ping`)

- Simple ping/pong functionality
- Responds with timestamp and original data
- Useful for connection testing

### **handleJoinRoom** (`join-room`)

- Joins socket to a specified room
- Validates room ID
- Notifies user and room members
- Emits: `room-joined`, `user-joined-room`

### **handleLeaveRoom** (`leave-room`)

- Removes socket from a room
- Validates room ID
- Notifies user and room members
- Emits: `room-left`, `user-left-room`

### **handleChatMessage** (`chat-message`)

- Handles chat messages in rooms
- Validates message data and length
- Checks room membership
- Emits: `new-message`, `message-sent`

### **handleSubscribeNotifications** (`subscribe-notifications`)

- Subscribes user to notifications
- Joins user-specific notification room
- Sends pending notifications
- Emits: `notifications-subscribed`, `pending-notifications`

### **handleRequestData** (`request-data`)

- Handles data requests with filters
- Supports pagination (limit/offset)
- Returns structured responses
- Emits: `data-response`

## 🎯 Usage Examples

### Client-Side (Frontend)

```javascript
// Connect to socket
const socket = io("http://localhost:4000");

// Use ping handler
socket.emit("ping", { test: "data" });
socket.on("pong", (response) => {
  console.log("Pong received:", response);
});

// Use chat handler
socket.emit("join-room", "general");
socket.emit("chat-message", {
  roomId: "general",
  message: "Hello everyone!",
  userId: "123",
  username: "John",
});

// Use data handler
socket.emit("request-data", {
  dataType: "users",
  limit: 10,
  offset: 0,
});
socket.on("data-response", (response) => {
  console.log("Data received:", response);
});
```

### Server-Side (Add Custom Logic)

```typescript
// Create a custom handler function
export function handleCustomChat(socket: Socket, data: ChatMessageData): void {
  // Add custom logic
  if (isSpam(data.message)) {
    socket.emit("error", { message: "Message rejected: spam detected" });
    return;
  }

  // Use the original handler logic
  handleChatMessage(socket, data);
}

function isSpam(message: string): boolean {
  // Your spam detection logic
  return false;
}

// Export the custom handler
export const customChatHandler = createSocketHandler("chat-message", handleCustomChat);
```

## 🧪 Testing

Functions are incredibly easy to test:

```typescript
// tests/handlers/ping.handler.test.ts
import { handlePing } from "../../src/socket/handlers/ping.handler";
import { createMockSocket } from "../mocks/socket.mock";

describe("handlePing", () => {
  it("should respond with pong", () => {
    const mockSocket = createMockSocket();

    handlePing(mockSocket, { test: "data" });

    expect(mockSocket.emit).toHaveBeenCalledWith("pong", {
      timestamp: expect.any(String),
      message: "pong",
      originalData: { test: "data" },
    });
  });
});
```

## 🚀 Benefits

### ✅ **Maximum Simplicity**

- Just functions - no classes, no inheritance
- Minimal boilerplate code
- Easy to understand at a glance

### ✅ **Pure Functions**

- Easy to test in isolation
- No side effects from class state
- Predictable behavior

### ✅ **Functional Programming**

- Composable functions
- Easy to create higher-order functions
- Functional composition patterns

### ✅ **Zero Overhead**

- No class instantiation
- No method binding
- Direct function calls

### ✅ **Developer Experience**

- Autocomplete works perfectly
- Easy debugging
- Clear call stack

### ✅ **Flexibility**

- Use functions directly
- Compose multiple handlers
- Create middleware easily

This functional approach makes your Socket.IO code extremely clean and maintainable! 🎉
