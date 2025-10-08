import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { t, JWT_SECRET } from "../../index";
import { users } from "../../db/schema";
import { or, eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const login = t.procedure.input(loginSchema).mutation(async ({ input }) => {
  return await catchErrors(async (globalTx) => {
    const { emailOrUsername, password } = input;
    // Find user by email or username
    const [user] = await globalTx
      .select()
      .from(users)
      .where(or(eq(users.email, emailOrUsername), eq(users.username, emailOrUsername)));

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email, username: user.username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
      message: "Login successful",
    };
  }, 5000); // 5 second timeout for login operations
});
