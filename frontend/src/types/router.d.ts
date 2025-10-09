/**
 * Generated Router Type Declarations
 * 
 * This file contains TypeScript type definitions for the tRPC router.
 * Import this in your frontend to get full type safety.
 */

import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

// The main router type definition
export interface AppRouter {
  ping: {
    ping: () => Promise<{ message: string; timestamp: number }>;
  };
  auth: {
    login: (input: { email: string; password: string }) => Promise<{ success: boolean; token?: string; user?: any; message?: string }>;
    signup: (input: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<{ success: boolean; token?: string; user?: any; message?: string }>;
    me: () => Promise<{ success: boolean; user?: any; message?: string }>;
  };
  user: {
    list: () => Promise<{ success: boolean; users?: any[]; message?: string }>;
    create: (input: { email: string; password: string; firstName?: string; lastName?: string; role?: string }) => Promise<{ success: boolean; user?: any; message?: string }>;
    update: (input: { id: number; email?: string; password?: string; firstName?: string; lastName?: string; role?: string }) => Promise<{ success: boolean; user?: any; message?: string }>;
    delete: (input: { id: number }) => Promise<{ success: boolean; message?: string }>;
  };
  script: {
    listScripts: () => Promise<{ success: boolean; scripts?: any[]; message?: string }>;
    execute: (input: { name: string; args?: string[] }) => Promise<{ success: boolean; output?: string; error?: string; message?: string }>;
  };
  notifications: {
    getSubscriptions: () => Promise<{ success: boolean; subscriptions?: any[]; message?: string }>;
    saveSubscription: (input: { subscription: any }) => Promise<{ success: boolean; message?: string }>;
    unsubscribe: (input: { endpoint: string }) => Promise<{ success: boolean; message?: string }>;
    sendNotification: (input: { title: string; body: string; icon?: string; badge?: string; tag?: string }) => Promise<{ success: boolean; message?: string }>;
    sendPush: (input: { title: string; body: string; userId?: number }) => Promise<{ success: boolean; message?: string }>;
    sendToUser: (input: { userId: number; title: string; body: string }) => Promise<{ success: boolean; message?: string }>;
    getPushStatus: () => Promise<{ success: boolean; enabled?: boolean; message?: string }>;
  };
}

// Infer input and output types from the router
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// Convenience type helpers for common operations
export type LoginInput = RouterInputs['auth']['login'];
export type SignupInput = RouterInputs['auth']['signup'];
export type UserOutput = RouterOutputs['auth']['me'];
export type PingInput = RouterInputs['ping']['ping'];
export type PingOutput = RouterOutputs['ping']['ping'];

// Additional tRPC utility types
export type TRPCSuccessResponse<T = any> = {
  success: true;
  data: T;
};

export type TRPCErrorResponse = {
  success: false;
  error: string;
  code?: string;
};

// Re-export tRPC utilities for convenience
export type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
