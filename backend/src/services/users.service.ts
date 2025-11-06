import { eq } from "drizzle-orm";
import { db, DbTransactionOrDB } from "../db/utils";
import * as SchemaDrizzle from "../db/schema";
import { TRPCError } from "@trpc/server";

async function findById(userId: string, tx: DbTransactionOrDB = db): Promise<SchemaDrizzle.User | undefined> {
  const [user] = await tx
    .select()
    .from(SchemaDrizzle.users)
    .where(eq(SchemaDrizzle.users.id, userId))
    .limit(1);
  return user;
}

async function findByEmail(
  email: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.User | undefined> {
  const [user] = await tx
    .select()
    .from(SchemaDrizzle.users)
    .where(eq(SchemaDrizzle.users.email, email.toLowerCase()))
    .limit(1);
  return user;
}

async function getByEmail(
  email: string,
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.User | undefined> {
  const [user] = await tx
    .select()
    .from(SchemaDrizzle.users)
    .where(eq(SchemaDrizzle.users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return user;
}

async function getByUsername(username: string, tx: DbTransactionOrDB = db): Promise<SchemaDrizzle.User> {
  const [user] = await tx
    .select()
    .from(SchemaDrizzle.users)
    .where(eq(SchemaDrizzle.users.username, username.toLowerCase()))
    .limit(1);
  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }
  return user;
}

async function getById(userId: string, tx: DbTransactionOrDB = db): Promise<SchemaDrizzle.User> {
  const user = await findById(userId, tx);

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return user;
}

async function update(
  data: Partial<SchemaDrizzle.NewUser> & { id: string },
  tx: DbTransactionOrDB = db
): Promise<SchemaDrizzle.User> {
  await getById(data.id, tx);

  const updatedUser = await tx
    .update(SchemaDrizzle.users)
    .set({ ...data })
    .where(eq(SchemaDrizzle.users.id, data.id))
    .returning()
    .then((res) => res[0]);

  return updatedUser;
}

async function create(data: SchemaDrizzle.NewUser, tx: DbTransactionOrDB = db): Promise<SchemaDrizzle.User> {
  const [createdUser] = await db
    .insert(SchemaDrizzle.users)
    .values({
      ...data,
    })
    .returning();

  return createdUser;
}

async function getAll(tx: DbTransactionOrDB = db): Promise<SchemaDrizzle.User[]> {
  const users = await tx.select().from(SchemaDrizzle.users);
  return users;
}

async function deleteUser(userId: string, tx: DbTransactionOrDB = db): Promise<void> {
  await tx.delete(SchemaDrizzle.users).where(eq(SchemaDrizzle.users.id, userId));
}

const _ServiceUsers = {
  findById,
  getByEmail,
  getById,
  update,
  getByUsername,
  create,
  findByEmail,
  getAll,
  deleteUser,
};

export default _ServiceUsers;
