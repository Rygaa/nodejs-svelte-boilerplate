import { createTRPCClient, createWSClient, wsLink, httpBatchLink, splitLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/trpc/router";

// Heartbeat state
let heartbeatInterval: number | null = null;
let lastHeartbeatTime: number = Date.now();
let connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';

// HTTP URL for API calls
const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:6100';
};

// create persistent WebSocket connection
const wsClient = createWSClient({
  url: () => {
    const token = localStorage.getItem("authToken");
    let wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:6100';
    
    // Ensure the URL ends with /ws path
    if (!wsUrl.endsWith('/ws')) {
      wsUrl = `${wsUrl}/ws`;
    }
    
    console.log(`wsUrl: ${wsUrl}`);
    return token 
      ? `${wsUrl}?token=${token}`
      : wsUrl;
  },
  onOpen: () => {
    console.log("✅ WebSocket connected");
    connectionStatus = 'connected';
    startHeartbeat();
  },
  onClose: () => {
    console.log("❌ WebSocket disconnected");
    connectionStatus = 'disconnected';
    stopHeartbeat();
  },
  onError: (error) => {
    console.error("❌ WebSocket error:", error);
    connectionStatus = 'error';
  },
  // Custom WebSocket implementation to handle server messages
  WebSocket: class extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      
      // Listen for messages from server
      this.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'REDIRECT') {
            console.warn(`🔀 Server requested redirect to ${data.url}: ${data.reason}`);
            
            // Clear authentication
            localStorage.removeItem('authToken');
            
            // Clear global store (need to import it)
            import('../store/globalStore.svelte').then(({ _globalStore }) => {
              _globalStore.user = null;
              _globalStore.authToken = null;
            });
            
            // Close the WebSocket connection
            this.close();
            
            // Redirect to error page
            window.location.href = data.url;
          }
        } catch (error) {
          // Not a JSON message or not our custom format, ignore
        }
      });
    }
  } as any,
});

// configure TRPCClient to use both HTTP and WebSocket
// Use HTTP for mutations and queries, WebSocket for subscriptions
const baseClient = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      // Use WebSocket for subscriptions only
      condition: (op) => op.type === 'subscription',
      true: wsLink({
        client: wsClient,
      }),
      // Use HTTP for queries and mutations
      false: httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        headers: () => {
          const token = localStorage.getItem("authToken");
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    }),
  ],
});

// Heartbeat functions
function startHeartbeat() {
  if (heartbeatInterval) return; // Already running
  
  console.log("💓 Starting heartbeat");
  heartbeatInterval = window.setInterval(async () => {
    try {
      const response = await baseClient.heartbeat.query();
      const latency = Date.now() - response.timestamp;
      lastHeartbeatTime = Date.now();
      console.log(`💓 Heartbeat OK (latency: ${latency}ms)`);
    } catch (error) {
      console.error("💔 Heartbeat failed:", error);
    }
  }, 10000); // Every 10 seconds
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    console.log("💔 Stopping heartbeat");
    window.clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Export heartbeat status getter
export function getConnectionStatus() {
  return {
    status: connectionStatus,
    lastHeartbeat: lastHeartbeatTime,
    timeSinceLastHeartbeat: Date.now() - lastHeartbeatTime,
  };
}

// Wrapper to handle errors and return consistent format
function wrapMutation<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      if (error instanceof TRPCClientError) {
        return {
          success: false,
          message: error.message,
          code: error.data?.code,
        };
      }
      return {
        success: false,
        message: "An unexpected error occurred",
      };
    }
  };
}

// Create wrapped client
export const trpc = {
  signup: {
    mutate: wrapMutation(baseClient.signup.mutate),
  },
  auth: {
    mutate: wrapMutation(baseClient.auth.mutate),
  },
  login: {
    mutate: wrapMutation(baseClient.login.mutate),
  },
  ping: baseClient.ping,
  heartbeat: baseClient.heartbeat,
  giveMeRandomNumber: baseClient.giveMeRandomNumber,
  listPdfs: baseClient.listPdfs,
  createCheckout: {
    mutate: wrapMutation(baseClient.createCheckout.mutate),
  },
  getCheckout: {
    query: wrapMutation(baseClient.getCheckout.query),
  },
  // New folder-based API
  getFolders: {
    query: wrapMutation(baseClient.getFolders.query),
  },
  getNestedFolders: {
    query: wrapMutation(baseClient.getNestedFolders.query),
  },
  createFolder: {
    mutate: wrapMutation(baseClient.createFolder.mutate),
  },
  updateFolder: {
    mutate: wrapMutation(baseClient.updateFolder.mutate),
  },
  deleteFolder: {
    mutate: wrapMutation(baseClient.deleteFolder.mutate),
  },
  uploadFile: {
    mutate: wrapMutation(baseClient.uploadFile.mutate),
  },
  getJpegFiles: {
    query: wrapMutation(baseClient.getJpegFiles.query),
  },
  createUser: {
    mutate: wrapMutation(baseClient.createUser.mutate),
  },
  getAllUsers: {
    query: wrapMutation(baseClient.getAllUsers.query),
  },
  updateUser: {
    mutate: wrapMutation(baseClient.updateUser.mutate),
  },
  deleteUser: {
    mutate: wrapMutation(baseClient.deleteUser.mutate),
  },
  updateMyPassword: {
    mutate: wrapMutation(baseClient.updateMyPassword.mutate),
  },
  // Annotations
  createAnnotation: {
    mutate: wrapMutation(baseClient.createAnnotation.mutate),
  },
  getAnnotations: {
    query: wrapMutation(baseClient.getAnnotations.query),
  },
  updateAnnotation: {
    mutate: wrapMutation(baseClient.updateAnnotation.mutate),
  },
  deleteAnnotation: {
    mutate: wrapMutation(baseClient.deleteAnnotation.mutate),
  },
};
