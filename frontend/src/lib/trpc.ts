import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/trpc/router";

const baseClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/trpc`,
      headers() {
        const token = localStorage.getItem("authToken");
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

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
  giveMeRandomNumber: baseClient.giveMeRandomNumber,
  listPdfs: baseClient.listPdfs,
  getPdf: {
    query: wrapMutation(baseClient.getPdf.query),
  },
  createCheckout: {
    mutate: wrapMutation(baseClient.createCheckout.mutate),
  },
  getCheckout: {
    query: wrapMutation(baseClient.getCheckout.query),
  },
};
