import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@backend/trpc/router";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL,
      headers() {
        const token = localStorage.getItem("auth-token");
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
