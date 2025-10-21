/**
 * Real-time logging service that broadcasts messages to connected clients
 */

import { existsSync, mkdirSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";
import { emitLog } from "../trpc/ws.router";

let ioInstance: any = null;

/**
 * Initialize the logger with optional Socket.IO instance
 */
function initLogger(io?: any): void {
  ioInstance = io;
}

/**
 * Log levels with colors and icons
 */
const LOG_LEVELS = {
  INFO: { icon: "ℹ️", color: "#2196F3" },
  SUCCESS: { icon: "✅", color: "#4CAF50" },
  WARNING: { icon: "⚠️", color: "#FF9800" },
  ERROR: { icon: "❌", color: "#F44336" },
  DEBUG: { icon: "🔍", color: "#9E9E9E" },
  PROCESS: { icon: "⚙️", color: "#607D8B" },
  API: { icon: "🌐", color: "#FF5722" },
  DATA: { icon: "📊", color: "#3F51B5" },
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data: any;
  icon: string;
  color: string;
  source?: string;
}

/**
 * Get the caller's file name from the stack trace
 */
function getCallerFileName(): string {
  try {
    const originalFunc = Error.prepareStackTrace;
    let callerfile;

    Error.prepareStackTrace = function (err, stack) {
      return stack;
    };

    const err = new Error();
    const currentfile = (err.stack as any)?.[0]?.getFileName();

    const stack = err.stack as any;
    if (stack && Array.isArray(stack)) {
      for (let i = 1; i < stack.length; i++) {
        callerfile = stack[i]?.getFileName();
        if (currentfile !== callerfile && callerfile) {
          break;
        }
      }
    }

    Error.prepareStackTrace = originalFunc;

    if (callerfile) {
      const fileName = callerfile.split("\\").pop() || callerfile.split("/").pop() || "unknown";
      return fileName;
    }
  } catch (e) {
    // Fallback: parse regular stack trace
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split("\n");
      for (let i = 2; i < lines.length; i++) {
        const match = lines[i].match(/\((.+):[\d:]+\)$/) || lines[i].match(/at (.+):[\d:]+$/);
        if (match && match[1]) {
          const fileName = match[1].split("\\").pop() || match[1].split("/").pop() || "unknown";
          return fileName;
        }
      }
    }
  }

  return "unknown";
}

/**
 * Broadcast a log message to all connected clients
 */
function broadcastLog(level: LogLevel, message: string, data: any = null, source: string): void {
  const timestamp = new Date().toISOString();

  const logEntry: LogEntry = {
    timestamp,
    level,
    message,
    data,
    icon: LOG_LEVELS[level]?.icon || "📝",
    color: LOG_LEVELS[level]?.color || "#000000",
    source,
  };

  // Console log for server
  const consoleMessage = `${logEntry.icon} [${timestamp}] ${message}`;

  if (data) {
  }

  // Broadcast to connected clients via tRPC WebSocket
  emitLog(logEntry);
}

/**
 * Log parameters interface
 */
interface LogParams {
  message: string;
  data?: any;
  source: string;
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  info: (params: LogParams) => broadcastLog("INFO", params.message, params.data, params.source),
  success: (params: LogParams) => broadcastLog("SUCCESS", params.message, params.data, params.source),
  warning: (params: LogParams) => broadcastLog("WARNING", params.message, params.data, params.source),
  error: (params: LogParams) => broadcastLog("ERROR", params.message, params.data, params.source),
  debug: (params: LogParams) => broadcastLog("DEBUG", params.message, params.data, params.source),
  process: (params: LogParams) => broadcastLog("PROCESS", params.message, params.data, params.source),
  api: (params: LogParams) => broadcastLog("API", params.message, params.data, params.source),
  data: (params: LogParams) => broadcastLog("DATA", params.message, params.data, params.source),

  // Progress tracking
  progress: (params: { current: number; total: number; message: string; source: string }) => {
    const percentage = Math.round((params.current / params.total) * 100);
    broadcastLog(
      "PROCESS",
      `${params.message} (${params.current}/${params.total} - ${percentage}%)`,
      {
        current: params.current,
        total: params.total,
        percentage,
      },
      params.source
    );
  },

  // API call tracking
  apiCall: (params: {
    endpoint: string;
    method: string;
    status: number;
    duration: number;
    source: string;
  }) => {
    const message = `${params.method} ${params.endpoint} - ${params.status} (${params.duration}ms)`;
    broadcastLog(
      "API",
      message,
      { endpoint: params.endpoint, method: params.method, status: params.status, duration: params.duration },
      params.source
    );
  },

  // Error with stack trace
  errorWithStack: (params: { message: string; error: Error; source: string }) => {
    broadcastLog(
      "ERROR",
      params.message,
      {
        message: params.error.message,
        stack: params.error.stack,
        code: (params.error as any).code,
      },
      params.source
    );
  },
};

export { initLogger };
export type { LogLevel, LogEntry, LogParams };
