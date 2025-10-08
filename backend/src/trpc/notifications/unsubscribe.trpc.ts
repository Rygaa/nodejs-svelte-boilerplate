import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";
import { subscriptionSchema } from "./utils";

// Remove subscription endpoint
export const unsubscribe = protectedProcedure.input(subscriptionSchema).mutation(async ({ ctx, input }) => {
  return await catchErrors(async (globalTx) => {
    const subscription = input;
    const user = ctx.user!;

    // Get current user's subscriptions
    const [currentUser] = await globalTx
      .select({
        webPushSubscriptionContainer: users.webPushSubscriptionContainer,
      })
      .from(users)
      .where(eq(users.id, user.userId));

    const currentSubscriptions = currentUser?.webPushSubscriptionContainer || [];
    const subscriptionString = JSON.stringify(subscription);

    const index = currentSubscriptions.findIndex((sub: string) => sub === subscriptionString);

    if (index !== -1) {
      const updatedSubscriptions = currentSubscriptions.filter((_: any, i: number) => i !== index);

      await globalTx
        .update(users)
        .set({
          webPushSubscriptionContainer: updatedSubscriptions,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.userId));

      console.log(`🗑️ Subscription removed for user ${user.email}:`, subscription.endpoint);

      return {
        message: "Unsubscribed successfully",
        total: updatedSubscriptions.length,
      };
    } else {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Subscription not found",
      });
    }
  });
});
