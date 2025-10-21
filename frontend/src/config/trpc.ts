import { createTRPCProxyClient, httpBatchLink, wsLink, splitLink, createWSClient } from "@trpc/client";
import type { AppRouter } from "@backend/trpc/router";

// WebSocket URL for subscriptions
const wsUrl = import.meta.env.VITE_API_URL?.replace('http://', 'ws://').replace('https://', 'wss://').replace('/trpc', '') || 'ws://localhost:4000';

// Create WebSocket client
const wsClient = createWSClient({
  url: wsUrl,
});

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition(op) {
        // Use WebSocket for subscriptions, HTTP for queries and mutations
        return op.type === 'subscription';
      },
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
        url: import.meta.env.VITE_API_URL,
        headers() {
          const token = localStorage.getItem("auth-token");
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    }),
  ],
});
