import { publicProcedure } from "../../index";
import { users } from "../../db/schema";
import { ne, sql } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";
import { PUBLIC_KEY, PRIVATE_KEY } from "./utils";

// Health check endpoint
export const getPushStatus = publicProcedure.query(async () => {
  return await catchErrors(async (globalTx) => {
    try {
      // Count total subscriptions across all users
      const usersWithSubscriptions = await globalTx
        .select({
          webPushSubscriptionContainer: users.webPushSubscriptionContainer,
        })
        .from(users)
        .where(ne(users.webPushSubscriptionContainer, sql`ARRAY[]::text[]`));

      const totalSubscriptions = usersWithSubscriptions.reduce(
        (sum: number, user: any) => sum + (user.webPushSubscriptionContainer?.length || 0),
        0
      );

      return {
        service: "Push Notification Service",
        status: "healthy",
        subscriptions: totalSubscriptions,
        usersWithSubscriptions: usersWithSubscriptions.length,
        vapidConfigured: !!(PUBLIC_KEY && PRIVATE_KEY),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: "Push Notification Service",
        status: "error",
        subscriptions: 0,
        vapidConfigured: !!(PUBLIC_KEY && PRIVATE_KEY),
        timestamp: new Date().toISOString(),
        error: "Failed to fetch subscription count",
      };
    }
  });
});
