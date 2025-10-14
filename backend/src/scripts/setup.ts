import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export async function ensureRootUser() {
  try {
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, "rygaa@pm.me")).limit(1);

    if (existingUser.length > 0) {
      // User exists, ensure they have ROOT role
      if (existingUser[0].role !== "ROOT") {
        await db
          .update(users)
          .set({
            role: "ROOT",
          })
          .where(eq(users.email, "rygaa@pm.me"));
      }
    } else {
      // Create root user - you'll need to provide the required fields
      console.log("Root user not found. Create the user first.");
    }
  } catch (error) {
    console.error("Error ensuring root user:", error);
  }
}

// General database setup function for future use
export async function setupDatabase() {
  try {
    // Ensure ROOT user
    await ensureRootUser();

    // Add other setup tasks here in the future
    // - Seed default filters
    // - Create default settings
    // - etc.
  } catch (error) {
    console.error("Error setting up database:", error);
  }
}
