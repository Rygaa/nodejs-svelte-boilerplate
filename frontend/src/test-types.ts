// Test file to verify tRPC types are working
import { trpc } from "./config/trpc";

// This should show proper type completion
export async function testTypes() {
  // Test auth procedures
  const loginResult = await trpc.auth.login.mutate({
    emailOrUsername: "rygaa@pm.me",
    password: "123456",
  });

  // Test user procedures
  const users = await trpc.user.list.query({
    limit: 10,
    offset: 0,
  }); // Test script procedures
  const scripts = await trpc.script.getScripts.query({});

  // Test notifications
  const subscriptions = await trpc.notifications.getSubscriptions.query({});
}
