import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";
import { subscriptionSchema } from "./utils";

// Save subscription endpoint
export const saveSubscription = protectedProcedure
  .input(subscriptionSchema)
  .mutation(async ({ ctx, input }) => {
    return await catchErrors(async (globalTx) => {
      const subscription = input;
      const user = ctx.user!;

      console.log(`📱 Saving subscription for user ${user.email}:`, subscription.endpoint);

      // Validate subscription object
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid subscription object",
        });
      }

      // Get current user's subscriptions
      const [currentUser] = await globalTx
        .select({
          webPushSubscriptionContainer: users.webPushSubscriptionContainer,
        })
        .from(users)
        .where(eq(users.id, user.userId));

      const currentSubscriptions = currentUser?.webPushSubscriptionContainer || [];
      const subscriptionString = JSON.stringify(subscription);

      // Check if subscription already exists
      const existingIndex = currentSubscriptions.findIndex((sub: string) => sub === subscriptionString);

      if (existingIndex === -1) {
        // Add new subscription
        const updatedSubscriptions = [...currentSubscriptions, subscriptionString];

        await globalTx
          .update(users)
          .set({
            webPushSubscriptionContainer: updatedSubscriptions,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.userId));

        console.log(`✅ New push subscription saved for user ${user.email}:`, subscription.endpoint);

        return {
          message: "Subscription saved successfully",
          user: { id: user.userId, email: user.email },
          total: updatedSubscriptions.length,
          isNew: true,
        };
      } else {
        console.log(`📱 Subscription already exists for user ${user.email}:`, subscription.endpoint);

        return {
          message: "Subscription already exists",
          user: { id: user.userId, email: user.email },
          total: currentSubscriptions.length,
          isNew: false,
        };
      }
    });
  });
