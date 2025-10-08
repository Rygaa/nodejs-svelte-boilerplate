import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import bcrypt from "bcryptjs";
import { users } from "../../db/schema";
import { eq, or, and, ne } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

const updateUserSchema = z.object({
  userId: z.string(),
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["USER", "ADMIN", "ROOT"]).optional(),
  password: z.string().min(6).optional(),
});

export const updateUser = protectedProcedure.input(updateUserSchema).mutation(async ({ ctx, input }) => {
  return await catchErrors(async (globalTx) => {
    const { userId, password, ...updateData } = input;

    // Only ROOT users can update users
    const [currentUser] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

    if (!currentUser || currentUser.role !== "ROOT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only ROOT users can update users",
      });
    }

    // Check if target user exists
    const [targetUser] = await globalTx.select().from(users).where(eq(users.id, userId));

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Prevent ROOT users from demoting themselves
    if (userId === ctx.user!.userId && updateData.role && updateData.role !== "ROOT") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "ROOT users cannot demote themselves",
      });
    }

    // Check for email/username conflicts if they're being updated
    if (updateData.email || updateData.username) {
      const whereConditions = [];
      if (updateData.email) whereConditions.push(eq(users.email, updateData.email));
      if (updateData.username) whereConditions.push(eq(users.username, updateData.username));

      const conflictUsers = await globalTx
        .select()
        .from(users)
        .where(and(ne(users.id, userId), or(...whereConditions)));

      if (conflictUsers.length > 0) {
        const conflictUser = conflictUsers[0];
        throw new TRPCError({
          code: "CONFLICT",
          message:
            conflictUser.email === updateData.email ? "Email already exists" : "Username already exists",
        });
      }
    }

    // Prepare update data
    const dataToUpdate: any = { ...updateData };

    // Hash password if provided
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 12);
    }

    // Always update the updatedAt timestamp
    dataToUpdate.updatedAt = new Date();

    // Update user
    const [updatedUser] = await globalTx
      .update(users)
      .set(dataToUpdate)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return {
      user: updatedUser,
      message: "User updated successfully",
    };
  });
});
