<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { io, type Socket } from "socket.io-client";
  import Button from "./Button.svelte";

  let socket: Socket | null = null;
  let isConnected = false;
  let socketId: string | null = null;
  let messages: Array<{
    id: string;
    type: "sent" | "received";
    content: any;
    timestamp: Date;
    event?: string;
  }> = [];
  let messagesContainer: HTMLElement;

  onMount(() => {
    connectSocket();
  });

  onDestroy(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  function connectSocket() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    console.log("SocketTester: Attempting to connect to:", backendUrl);

    socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("SocketTester: Connected to server with ID:", socket?.id);
      isConnected = true;
      socketId = socket?.id || null;
      addMessage("System", "received", { message: "Connected to server", socketId: socket?.id });
    });

    socket.on("disconnect", () => {
      console.log("SocketTester: Disconnected from server");
      isConnected = false;
      socketId = null;
      addMessage("System", "received", { message: "Disconnected from server" });
    });

    socket.on("connect_error", (error) => {
      console.error("SocketTester: Connection error:", error);
      addMessage("System", "received", { message: "Connection error", error: error.message });
    });

    // Listen for ping responses
    socket.on("pong", (data) => {
      addMessage("pong", "received", data);
    });

    // Listen for room join confirmations
    socket.on("room-joined", (data) => {
      addMessage("room-joined", "received", data);
    });

    // Listen for room leave confirmations
    socket.on("room-left", (data) => {
      addMessage("room-left", "received", data);
    });

    // Listen for chat messages
    socket.on("new-message", (data) => {
      addMessage("new-message", "received", data);
    });

    // Listen for message sent confirmations
    socket.on("message-sent", (data) => {
      addMessage("message-sent", "received", data);
    });

    // Listen for data responses
    socket.on("data-response", (data) => {
      addMessage("data-response", "received", data);
    });

    // Listen for notification subscriptions
    socket.on("notifications-subscribed", (data) => {
      addMessage("notifications-subscribed", "received", data);
    });

    // Listen for pending notifications
    socket.on("pending-notifications", (data) => {
      addMessage("pending-notifications", "received", data);
    });

    // Listen for errors
    socket.on("error", (data) => {
      addMessage("error", "received", data);
    });

    // Listen for user joined/left room notifications
    socket.on("user-joined-room", (data) => {
      addMessage("user-joined-room", "received", data);
    });

    socket.on("user-left-room", (data) => {
      addMessage("user-left-room", "received", data);
    });
  }

  function addMessage(event: string, type: "sent" | "received", content: any) {
    const message = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date(),
      event,
    };

    messages = [...messages, message];

    // Auto-scroll to bottom
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  function sendMessage() {
    if (!socket) return;

    const message = "Hello";
    socket.emit("ping", message);
    addMessage("ping", "sent", message);
  }

  function clearMessages() {
    messages = [];
  }

  function formatContent(content: any): string {
    if (typeof content === "string") {
      return content;
    }
    return JSON.stringify(content, null, 2);
  }

  function getMessageTypeClass(type: "sent" | "received"): string {
    return type === "sent" ? "bg-blue-100 border-blue-300 ml-8" : "bg-gray-100 border-gray-300 mr-8";
  }

  function getEventBadgeClass(event: string): string {
    const colors: Record<string, string> = {
      ping: "bg-green-100 text-green-800",
      pong: "bg-green-100 text-green-800",
      "join-room": "bg-blue-100 text-blue-800",
      "leave-room": "bg-yellow-100 text-yellow-800",
      "chat-message": "bg-purple-100 text-purple-800",
      "new-message": "bg-purple-100 text-purple-800",
      error: "bg-red-100 text-red-800",
      System: "bg-gray-100 text-gray-800",
    };
    return colors[event] || "bg-gray-100 text-gray-800";
  }
</script>

<div class="bg-white rounded-lg shadow-md p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-semibold text-gray-800">Socket Communication</h2>
    <div class="flex items-center space-x-2">
      <div class="flex items-center">
        <div class="w-3 h-3 rounded-full {isConnected ? 'bg-green-400' : 'bg-red-400'} mr-2"></div>
        <span class="text-sm text-gray-600">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      {#if !isConnected}
        <Button variant="ghost" size="sm" on:click={connectSocket}>Reconnect</Button>
      {/if}
      <Button variant="ghost" size="sm" on:click={clearMessages}>Clear</Button>
    </div>
  </div>

  <!-- Message Input Area -->
  <div class="mb-4 space-y-3">
    <div class="flex justify-center">
      <Button on:click={sendMessage} disabled={!isConnected} size="lg">Send Hello</Button>
    </div>
  </div>

  <!-- Messages Display -->
  <div
    bind:this={messagesContainer}
    class="border border-gray-200 rounded-lg h-96 overflow-y-auto p-4 space-y-3 bg-gray-50"
  >
    {#if messages.length === 0}
      <div class="text-center text-gray-500 mt-8">
        <p>No messages yet. Send a message to start testing!</p>
      </div>
    {/if}

    {#each messages as message (message.id)}
      <div class="border rounded-lg p-3 {getMessageTypeClass(message.type)}">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full {getEventBadgeClass(message.event || '')}">
              {message.event}
            </span>
            <span class="text-xs text-gray-500 font-medium">
              {message.type === "sent" ? "SENT" : "RECEIVED"}
            </span>
          </div>
          <span class="text-xs text-gray-400">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <pre
          class="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-2 rounded border overflow-x-auto">{formatContent(
            message.content
          )}</pre>
      </div>
    {/each}
  </div>

  <!-- Connection Info -->
  <div class="mt-4 text-xs text-gray-500 border-t pt-3">
    <p>Socket ID: {socketId || "Not connected"}</p>
    <p>Backend URL: {import.meta.env.VITE_BACKEND_URL}</p>
  </div>
</div>
