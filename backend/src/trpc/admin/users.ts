import { z } from "zod";
import bcrypt from "bcryptjs";
import { protectedProcedure, publicProcedure, TRPCError } from "../../index";
import _ServiceUsers from "../../services/users.service";
import _UtilsJwt from "../../utils/jwt";

export const getAllUsers = protectedProcedure.query(async ({ ctx }) => {
  // Check if user is admin
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can access this resource",
    });
  }

  const users = await _ServiceUsers.getAll();

  return {
    success: true,
    data: users.map((user: any) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      subscriptionEndDate: user.subscriptionEndDate,
      createdAt: user.createdAt,
    })),
  };
});

export const createUser = protectedProcedure
  .input(
    z.object({
      email: z.string().email("Invalid email address").toLowerCase(),
      password: z.string().min(8, "Password must be at least 8 characters"),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      username: z.string().optional(),
      role: z.enum(["USER", "ADMIN"]).default("USER"),
      subscriptionEndDate: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Check if user is admin
    if (ctx.user.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can create users",
      });
    }

    const { email, password, firstName, lastName, username, role, subscriptionEndDate } = input;

    // Check if user already exists
    const doesUserExist = await _ServiceUsers.findByEmail(email);

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
      firstName: firstName || null,
      lastName: lastName || null,
      username: username || null,
      role: role,
      subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate) : null,
    });

    return {
      success: true,
      data: {
        id: createdUser.id,
        email: createdUser.email,
        username: createdUser.username,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        avatar: createdUser.avatar,
        role: createdUser.role,
        subscriptionEndDate: createdUser.subscriptionEndDate,
        createdAt: createdUser.createdAt,
      },
      message: "User created successfully",
    };
  });

export const updateUser = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      email: z.string().email("Invalid email address").toLowerCase().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      username: z.string().optional(),
      role: z.enum(["USER", "ADMIN"]).optional(),
      subscriptionEndDate: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Check if user is admin
    if (ctx.user.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can update users",
      });
    }

    const { id, email, firstName, lastName, username, role, subscriptionEndDate } = input;

    // Check if user exists
    const existingUser = await _ServiceUsers.getById(id);

    if (!existingUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // If email is being changed, check if new email is already in use
    if (email && email !== existingUser.email) {
      const emailInUse = await _ServiceUsers.findByEmail(email);
      if (emailInUse) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email is already in use",
        });
      }
    }

    const updatedUser = await _ServiceUsers.update({
      id,
      ...(email && { email }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(username !== undefined && { username }),
      ...(role && { role }),
      ...(subscriptionEndDate !== undefined && {
        subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate) : null,
      }),
    });

    return {
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        subscriptionEndDate: updatedUser.subscriptionEndDate,
        createdAt: updatedUser.createdAt,
      },
      message: "User updated successfully",
    };
  });

export const deleteUser = protectedProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Check if user is admin
    if (ctx.user.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can delete users",
      });
    }

    const { id } = input;

    // Prevent admin from deleting themselves
    if (id === ctx.user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot delete your own account",
      });
    }

    // Check if user exists
    const existingUser = await _ServiceUsers.getById(id);

    if (!existingUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await _ServiceUsers.deleteUser(id);

    return {
      success: true,
      message: "User deleted successfully",
    };
  });
