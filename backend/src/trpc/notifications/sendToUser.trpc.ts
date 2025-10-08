import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../index";
import { catchErrors } from "../../utils/catchErrors";
import { sendToUserSchema, sendNotificationToUser } from "./utils";

// Send notification to specific user
export const sendToUser = protectedProcedure.input(sendToUserSchema).mutation(async ({ ctx, input }) => {
  return await catchErrors(async (globalTx) => {
    const { userId, title, body, icon } = input;
    const requester = ctx.user!;

    console.log(`🔔 ${requester.email} wants to send notification to user ${userId}`);

    const result = await sendNotificationToUser(
      globalTx,
      userId,
      title || "Notification",
      body || "You have a new message!",
      icon || "/favicon.ico"
    );

    if (result.total === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No subscriptions found for this user",
      });
    }

    return {
      message: `Notification sent to user ${userId}`,
      ...result,
    };
  });
});
