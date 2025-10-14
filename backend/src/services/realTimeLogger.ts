/**
 * Real-time logging service that broadcasts messages to connected clients
 */

let ioInstance: any = null;

/**
 * Initialize the logger with Socket.IO instance
 */
function initLogger(io: any): void {
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
function broadcastLog(level: LogLevel, message: string, data: any = null, source?: string): void {
  const timestamp = new Date().toISOString();

  // Get caller file name if source not provided
  const callerSource = source || getCallerFileName();

  const logEntry: LogEntry = {
    timestamp,
    level,
    message,
    data,
    icon: LOG_LEVELS[level]?.icon || "📝",
    color: LOG_LEVELS[level]?.color || "#000000",
    source: callerSource,
  };

  // Console log for server
  const consoleMessage = `${logEntry.icon} [${timestamp}] ${message}`;

  if (data) {
  }

  // Broadcast to connected clients
  if (ioInstance) {
    ioInstance.emit("discovery-log", logEntry);
  }
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  info: (message: string, data?: any, source?: string) => broadcastLog("INFO", message, data, source),
  success: (message: string, data?: any, source?: string) => broadcastLog("SUCCESS", message, data, source),
  warning: (message: string, data?: any, source?: string) => broadcastLog("WARNING", message, data, source),
  error: (message: string, data?: any, source?: string) => broadcastLog("ERROR", message, data, source),
  debug: (message: string, data?: any, source?: string) => broadcastLog("DEBUG", message, data, source),
  process: (message: string, data?: any, source?: string) => broadcastLog("PROCESS", message, data, source),
  api: (message: string, data?: any, source?: string) => broadcastLog("API", message, data, source),
  data: (message: string, data?: any, source?: string) => broadcastLog("DATA", message, data, source),

  // Progress tracking
  progress: (current: number, total: number, message: string, source?: string) => {
    const percentage = Math.round((current / total) * 100);
    broadcastLog(
      "PROCESS",
      `${message} (${current}/${total} - ${percentage}%)`,
      {
        current,
        total,
        percentage,
      },
      source
    );
  },

  // API call tracking
  apiCall: (endpoint: string, method: string, status: number, duration: number, source?: string) => {
    const message = `${method} ${endpoint} - ${status} (${duration}ms)`;
    broadcastLog("API", message, { endpoint, method, status, duration }, source);
  },

  // Error with stack trace
  errorWithStack: (message: string, error: Error, source?: string) => {
    broadcastLog(
      "ERROR",
      message,
      {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      },
      source
    );
  },
};

export { initLogger };
export type { LogLevel, LogEntry };
