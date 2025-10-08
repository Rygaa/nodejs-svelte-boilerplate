import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "shared";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || "http://localhost:4000/trpc",
      headers() {
        const token = localStorage.getItem("auth-token");
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
