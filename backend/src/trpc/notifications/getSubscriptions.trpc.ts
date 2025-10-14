import { protectedProcedure, z } from "../../index";
import { users } from "../../db/schema";
import { ne, sql } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

// Get all subscriptions (for debugging)
export const getSubscriptions = protectedProcedure.input(z.object({})).query(async ({ ctx }) => {
  return await catchErrors(async (globalTx) => {
    const usersWithSubscriptions = await globalTx
      .select({
        id: users.id,
        email: users.email,
        webPushSubscriptionContainer: users.webPushSubscriptionContainer,
      })
      .from(users)
      .where(ne(users.webPushSubscriptionContainer, sql`ARRAY[]::text[]`));

    const totalSubscriptions = usersWithSubscriptions.reduce(
      (sum: number, user: any) => sum + (user.webPushSubscriptionContainer?.length || 0),
      0
    );

    return {
      count: totalSubscriptions,
      users: usersWithSubscriptions.map((user: any) => ({
        userId: user.id,
        email: user.email,
        subscriptionCount: user.webPushSubscriptionContainer?.length || 0,
      })),
    };
  });
});
