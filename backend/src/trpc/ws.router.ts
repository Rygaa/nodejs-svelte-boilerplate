import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { publicProcedure, router } from '../index';
import { logger } from '../services/logger.service';

// Global event emitter for real-time events
export const wsEventEmitter = new EventEmitter();

// Define event types
export const EventTypes = {
  PING: 'ping',
  PONG: 'pong',
  NOTIFICATION: 'notification',
  LOG: 'log',
  SCRIPT_UPDATE: 'script_update',
  USER_UPDATE: 'user_update',
} as const;

type EventType = typeof EventTypes[keyof typeof EventTypes];

export interface WSEvent {
  type: EventType;
  data: any;
  timestamp: string;
  userId?: string;
}

export const wsRouter = router({
  // Ping subscription for testing WebSocket connection
  ping: publicProcedure
    .input(z.object({ message: z.string().optional() }).optional())
    .subscription(({ input }) => {
      return observable<{ message: string; timestamp: string; originalData?: any }>((emit) => {
        logger.debug({
          message: 'WebSocket ping subscription started',
          data: { input },
          source: 'ws.router.ts',
        });

        // Send immediate pong response
        emit.next({
          message: 'Hey',
          timestamp: new Date().toISOString(),
          originalData: input,
        });

        // Set up ping interval (optional)
        const interval = setInterval(() => {
          emit.next({
            message: 'Periodic ping',
            timestamp: new Date().toISOString(),
            originalData: input,
          });
        }, 30000); // Every 30 seconds

        // Cleanup function
        return () => {
          clearInterval(interval);
          logger.debug({
            message: 'WebSocket ping subscription ended',
            source: 'ws.router.ts',
          });
        };
      });
    }),

  // General event subscription
  onEvent: publicProcedure
    .input(z.object({ 
      eventTypes: z.array(z.string()).optional(),
      userId: z.string().optional()
    }).optional())
    .subscription(({ input }) => {
      return observable<WSEvent>((emit) => {
        const eventTypes = input?.eventTypes || Object.values(EventTypes);
        const userId = input?.userId;

        logger.debug({
          message: 'WebSocket event subscription started',
          data: { eventTypes, userId },
          source: 'ws.router.ts',
        });

        const handleEvent = (event: WSEvent) => {
          // Filter by event type
          if (!eventTypes.includes(event.type)) {
            return;
          }

          // Filter by user ID if specified
          if (userId && event.userId && event.userId !== userId) {
            return;
          }

          emit.next(event);
        };

        // Listen to all events
        wsEventEmitter.on('event', handleEvent);

        // Cleanup function
        return () => {
          wsEventEmitter.off('event', handleEvent);
          logger.debug({
            message: 'WebSocket event subscription ended',
            data: { eventTypes, userId },
            source: 'ws.router.ts',
          });
        };
      });
    }),

  // Notifications subscription
  onNotification: publicProcedure
    .input(z.object({ userId: z.string() }))
    .subscription(({ input }) => {
      return observable<{ message: string; type: string; timestamp: string }>((emit) => {
        logger.debug({
          message: 'WebSocket notification subscription started',
          data: { userId: input.userId },
          source: 'ws.router.ts',
        });

        const handleNotification = (event: WSEvent) => {
          if (event.type === EventTypes.NOTIFICATION && 
              (!event.userId || event.userId === input.userId)) {
            emit.next({
              message: event.data.message || 'New notification',
              type: event.data.type || 'info',
              timestamp: event.timestamp,
            });
          }
        };

        wsEventEmitter.on('event', handleNotification);

        return () => {
          wsEventEmitter.off('event', handleNotification);
          logger.debug({
            message: 'WebSocket notification subscription ended',
            data: { userId: input.userId },
            source: 'ws.router.ts',
          });
        };
      });
    }),

  // Logs subscription
  onLogs: publicProcedure
    .input(z.object({ 
      level: z.string().optional(),
      source: z.string().optional()
    }).optional())
    .subscription(({ input }) => {
      return observable<any>((emit) => {
        logger.debug({
          message: 'WebSocket logs subscription started',
          data: input,
          source: 'ws.router.ts',
        });

        const handleLog = (event: WSEvent) => {
          if (event.type === EventTypes.LOG) {
            // Filter by level and source if specified
            const logData = event.data;
            if (input?.level && logData.level !== input.level) {
              return;
            }
            if (input?.source && logData.source !== input.source) {
              return;
            }
            
            emit.next(logData);
          }
        };

        wsEventEmitter.on('event', handleLog);

        return () => {
          wsEventEmitter.off('event', handleLog);
          logger.debug({
            message: 'WebSocket logs subscription ended',
            data: input,
            source: 'ws.router.ts',
          });
        };
      });
    }),
});

// Helper functions to emit events
export const emitWSEvent = (type: EventType, data: any, userId?: string) => {
  const event: WSEvent = {
    type,
    data,
    timestamp: new Date().toISOString(),
    userId,
  };
  
  wsEventEmitter.emit('event', event);
  
  logger.debug({
    message: `WebSocket event emitted: ${type}`,
    data: { type, userId, dataPreview: JSON.stringify(data).slice(0, 100) },
    source: 'ws.router.ts',
  });
};

export const emitPing = (data?: any) => emitWSEvent(EventTypes.PING, data);
export const emitPong = (data?: any) => emitWSEvent(EventTypes.PONG, data);
export const emitNotification = (message: string, type: string = 'info', userId?: string) => 
  emitWSEvent(EventTypes.NOTIFICATION, { message, type }, userId);
export const emitLog = (logData: any) => emitWSEvent(EventTypes.LOG, logData);
export const emitScriptUpdate = (scriptData: any, userId?: string) => 
  emitWSEvent(EventTypes.SCRIPT_UPDATE, scriptData, userId);
export const emitUserUpdate = (userData: any, userId?: string) => 
  emitWSEvent(EventTypes.USER_UPDATE, userData, userId);