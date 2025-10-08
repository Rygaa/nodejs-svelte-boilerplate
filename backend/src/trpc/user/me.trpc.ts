import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../index";
import { logger } from "../../services/logger.service";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export const me = protectedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/auth/me",
      tags: ["auth"],
      summary: "Get current user",
      description: "Get the current authenticated user's information",
      protect: true,
    },
  })
  .input(z.object({}))
  .query(async ({ ctx }) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ctx.user.userId));

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  });
