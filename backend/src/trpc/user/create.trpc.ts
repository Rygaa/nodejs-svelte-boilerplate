import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../index";
import bcrypt from "bcryptjs";
import { catchErrors } from "../../utils/catchErrors";
import { users } from "../../db/schema";
import { eq, or } from "drizzle-orm";

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["USER", "ADMIN", "ROOT"]).default("USER"),
  password: z.string().min(6),
});

export const createUser = protectedProcedure.input(createUserSchema).mutation(async ({ ctx, input }) => {
  return await catchErrors(async (globalTx) => {
    const { email, username, password, ...userData } = input;

    // Only ROOT users can create users
    const [currentUser] = await globalTx.select().from(users).where(eq(users.id, ctx.user!.userId));

    if (!currentUser || currentUser.role !== "ROOT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only ROOT users can create users",
      });
    }

    // Check if user already exists
    const existingUsers = await globalTx
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)));

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      throw new TRPCError({
        code: "CONFLICT",
        message: existingUser.email === email ? "Email already exists" : "Username already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const now = new Date();
    const [user] = await globalTx
      .insert(users)
      .values({
        email,
        username,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
        ...userData,
      })
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
      user,
      message: "User created successfully",
    };
  });
});
