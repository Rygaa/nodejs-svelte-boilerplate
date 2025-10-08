import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { t, JWT_SECRET } from "../../index";
import { db } from "../../db";
import { users } from "../../db/schema";
import { or, eq } from "drizzle-orm";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signup = t.procedure.input(signupSchema).mutation(async ({ input }) => {
  const { email, username, password } = input;

  // Check if user already exists
  const existingUsers = await db
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
  const [user] = await db
    .insert(users)
    .values({
      email,
      username,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
    });

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email, username: user.username }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return {
    user,
    token,
    message: "Account created successfully",
  };
});
