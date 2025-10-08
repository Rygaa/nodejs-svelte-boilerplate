import { publicProcedure, TRPCError } from "../../index";
import { catchErrors } from "../../utils/catchErrors";
import { sendNotificationSchema, sendNotificationToUser, sendNotificationToAllUsers } from "./utils";
import webpush from "web-push";

// Send notification endpoint (supports multiple modes)
export const sendNotification = publicProcedure.input(sendNotificationSchema).mutation(async ({ input }) => {
  return await catchErrors(async (globalTx) => {
    const { subscription, title, body, icon, url, userId } = input;

    // If userId is provided, use utility function
    if (userId) {
      const result = await sendNotificationToUser(
        globalTx,
        userId,
        title || "Task Manager",
        body || "You have a new notification!",
        icon || "/favicon.ico"
      );

      return {
        message: `Notification sent to user ${userId}`,
        ...result,
      };
    }

    // If single subscription provided (legacy support)
    if (subscription && subscription.endpoint) {
      const isApple = subscription.endpoint.includes("web.push.apple.com");

      console.log(`Sending to ${isApple ? "iOS" : "other"} device:`, subscription.endpoint);

      // iOS-optimized payload
      const payload = JSON.stringify({
        title: title || "Task Manager",
        body: body || "You have a new notification!",
        icon: icon || "/favicon.ico",
        url: url || "/",
        tag: "task-notification",
        timestamp: Date.now(),
      });

      // iOS-specific options
      const options = {
        TTL: 3600, // 1 hour
        urgency: "normal",
        headers: {},
      } as any;

      if (isApple) {
        // iOS-specific headers
        options.headers["apns-priority"] = "10";
        options.headers["apns-topic"] = new URL(subscription.endpoint).hostname;
      }

      try {
        await webpush.sendNotification(subscription, payload, options);

        console.log("✅ Notification sent successfully");
        return {
          message: "Notification sent successfully",
          platform: isApple ? "iOS" : "other",
          successful: 1,
          failed: 0,
          total: 1,
        };
      } catch (error: any) {
        console.error("❌ Error sending notification:", error);

        // More detailed error logging for iOS
        if (error.statusCode) {
          console.error("Status code:", error.statusCode);
          console.error("Headers:", error.headers);
          console.error("Body:", error.body);
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send notification",
          cause: error,
        });
      }
    }

    // If neither userId nor subscription provided, send to all users
    const result = await sendNotificationToAllUsers(
      globalTx,
      title || "Task Manager",
      body || "You have a new notification!",
      icon || "/favicon.ico"
    );

    return {
      message: "Broadcast notification sent",
      ...result,
    };
  });
});
