import { z } from "zod";
import webpush from "web-push";
import { users } from "../../db/schema";
import { eq, ne, sql } from "drizzle-orm";
import type { DbTransaction } from "../../db/utils";

// 🔐 Replace with your actual VAPID keys
export const PUBLIC_KEY =
  "BKEQRvZF_qqF8UQZ4qdfipzLcQbp5quHn03BUwlv5tQF8GIPogCh_MpazQVm_LD1VdeoWPhNEmOEaWlr69XdNdQ";
export const PRIVATE_KEY = "GExsTdpYGZzBSiFpcR9T0NiXBIQS1erYQNXKLLGuDak";

// Setup VAPID
webpush.setVapidDetails("mailto:you@example.com", PUBLIC_KEY, PRIVATE_KEY);

// Input schemas
export const subscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export const notificationSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  icon: z.string().optional(),
  url: z.string().optional(),
});

export const sendToUserSchema = z.object({
  userId: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
  icon: z.string().optional(),
});

export const sendNotificationSchema = z.object({
  subscription: subscriptionSchema.optional(),
  userId: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  icon: z.string().optional(),
  url: z.string().optional(),
});

// Utility function to send notification to a specific user
export async function sendNotificationToUser(
  globalTx: DbTransaction,
  userId: string,
  title: string,
  body: string,
  icon: string = "/favicon.ico"
): Promise<{ successful: number; failed: number; total: number }> {
  try {
    // Get the specific user's subscriptions
    const [targetUser] = await globalTx
      .select({
        id: users.id,
        email: users.email,
        webPushSubscriptionContainer: users.webPushSubscriptionContainer,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!targetUser || !targetUser.webPushSubscriptionContainer?.length) {
      console.log(`📭 No subscriptions found for user ${userId}`);
      return { successful: 0, failed: 0, total: 0 };
    }

    // Parse subscriptions
    const userSubscriptions: any[] = [];
    (targetUser.webPushSubscriptionContainer || []).forEach((subString: string) => {
      try {
        const subscription = JSON.parse(subString);
        userSubscriptions.push({
          subscription,
          userEmail: targetUser.email,
          userId: targetUser.id,
        });
      } catch (e) {
        console.error(`Invalid subscription for user ${targetUser.email}:`, e);
      }
    });

    const payload = JSON.stringify({
      title,
      body,
      icon,
    });

    const results = await Promise.allSettled(
      userSubscriptions.map((subData) => {
        return webpush.sendNotification(subData.subscription, payload).catch((err) => {
          console.error(`❌ Push failed for user ${subData.userEmail}:`, err);
          throw err;
        });
      })
    );

    const successful = results.filter((result: any) => result.status === "fulfilled").length;
    const failed = results.length - successful;

    console.log(
      `📨 Sent notification to user ${targetUser.email}: ${successful}/${results.length} successful`
    );

    return { successful, failed, total: results.length };
  } catch (error) {
    console.error(`❌ Error sending notification to user ${userId}:`, error);
    return { successful: 0, failed: 1, total: 1 };
  }
}

// Utility function to send notification to multiple users
export async function sendNotificationToUsers(
  globalTx: DbTransaction,
  userIds: string[],
  title: string,
  body: string,
  icon: string = "/favicon.ico"
): Promise<{ successful: number; failed: number; total: number; userResults: any[] }> {
  const userResults = await Promise.allSettled(
    userIds.map((userId) => sendNotificationToUser(globalTx, userId, title, body, icon))
  );

  const totals = userResults.reduce(
    (acc, result: any) => {
      if (result.status === "fulfilled") {
        acc.successful += result.value.successful;
        acc.failed += result.value.failed;
        acc.total += result.value.total;
      } else {
        acc.failed += 1;
        acc.total += 1;
      }
      return acc;
    },
    { successful: 0, failed: 0, total: 0 }
  );

  return {
    ...totals,
    userResults: userResults.map((result: any, index) => ({
      userId: userIds[index],
      status: result.status,
      result: result.status === "fulfilled" ? result.value : result.reason,
    })),
  };
}

// Utility function to send notification to all users
export async function sendNotificationToAllUsers(
  globalTx: DbTransaction,
  title: string,
  body: string,
  icon: string = "/favicon.ico"
): Promise<{ successful: number; failed: number; total: number }> {
  try {
    // Get all users with subscriptions
    const usersWithSubscriptions = await globalTx
      .select({
        id: users.id,
      })
      .from(users)
      .where(ne(users.webPushSubscriptionContainer, sql`ARRAY[]::text[]`));

    if (usersWithSubscriptions.length === 0) {
      console.log("📭 No users with subscriptions found");
      return { successful: 0, failed: 0, total: 0 };
    }

    const userIds = usersWithSubscriptions.map((user: any) => user.id);
    const result = await sendNotificationToUsers(globalTx, userIds, title, body, icon);

    return { successful: result.successful, failed: result.failed, total: result.total };
  } catch (error) {
    console.error("❌ Error sending notification to all users:", error);
    return { successful: 0, failed: 1, total: 1 };
  }
}
