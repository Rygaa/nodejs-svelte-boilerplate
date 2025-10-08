import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "../../index";
import { catchErrors } from "../../utils/catchErrors";
import { notificationSchema, sendNotificationToAllUsers } from "./utils";

// Legacy endpoint (keeping for compatibility)
export const sendPush = publicProcedure.input(notificationSchema).mutation(async ({ input }) => {
  return await catchErrors(async (globalTx) => {
    const { title, body, icon } = input;

    const result = await sendNotificationToAllUsers(
      globalTx,
      title || "Task Manager",
      body || "You have a new notification!",
      icon || "/favicon.ico"
    );

    if (result.total === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No subscriptions available",
      });
    }

    return {
      message: "Push notifications sent",
      ...result,
    };
  });
});
