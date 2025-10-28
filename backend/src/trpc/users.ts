import { z } from "zod";
import bcrypt from "bcryptjs";
import { protectedProcedure, publicProcedure, TRPCError } from "../index";
import _ServiceUsers from "../services/users.service";
import _UtilsJwt from "../utils/jwt";

export const signup = publicProcedure
  .input(
    z.object({
      email: z.string().email("Invalid email address").toLowerCase(),
      password: z.string().min(8, "Password must be at least 8 characters"),
    })
  )
  .mutation(async ({ input }) => {
    const { email, password } = input;

    const doesUserExist = await _ServiceUsers.findById(email);

    if (doesUserExist) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await _ServiceUsers.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "USER",
    });

    const authToken = await _UtilsJwt.generateUserToken({
      id: createdUser.id,
      email: createdUser.email,
    });

    return {
      success: true,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        username: createdUser.username,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        avatar: createdUser.avatar,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
      },
      authToken,
    };
  });

export const login = publicProcedure
  .input(
    z.object({
      email: z.string().email("Invalid email address").toLowerCase(),
      password: z.string().min(1, "Password is required"),
    })
  )
  .mutation(async ({ input }) => {
    const { email, password } = input;

    const user = await _ServiceUsers.findById(email.toLowerCase());

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const authToken = await _UtilsJwt.generateUserToken({
      id: user.id,
      email: user.email,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        subscriptionEndDate: user.subscriptionEndDate,
      },
      authToken,
    };
  });

export const auth = protectedProcedure.mutation(async ({ ctx, input }) => {
  const authToken = await _UtilsJwt.generateUserToken({
    id: ctx.user.id,
    email: ctx.user.email,
  });

  return {
    success: true,
    user: ctx.user,
    message: "Authenticated",
    authToken,
  };
});
