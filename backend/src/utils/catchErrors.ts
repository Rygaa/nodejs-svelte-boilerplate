import { TRPCError } from "@trpc/server";
import { db, DbTransaction } from "../db/utils";

// Error handling wrapper with Drizzle transaction

export async function catchErrors<T>(
  operation: (db: DbTransaction) => Promise<T>,
  timeout: number = 5000
): Promise<T> {
  try {
    // Execute the operation within a Drizzle transaction
    return await db.transaction(async (tx: DbTransaction) => {
      return await operation(tx);
    });
  } catch (error: any) {
    // Handle specific PostgreSQL errors
    if (error.code === "23505") {
      // unique_violation
      throw new TRPCError({
        code: "CONFLICT",
        message: "A record with this data already exists",
      });
    }

    if (error.code === "23503") {
      // foreign_key_violation
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Referenced record does not exist",
      });
    }

    if (error.code === "23502") {
      // not_null_violation
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Required field is missing",
      });
    }

    // Handle tRPC errors (re-throw as-is)
    if (error instanceof TRPCError) {
      throw error;
    }

    // Handle generic errors - use the original error message
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error?.message || "Operation failed",
    });
  }
}
