import { router, ping } from "../index";
import { login } from "../trpc/user/login.trpc";
import { signup } from "../trpc/user/signup.trpc";
import { me } from "../trpc/user/me.trpc";
import { list as listUsers } from "../trpc/user/list.trpc";
import { updateUser } from "../trpc/user/update.trpc";
import { deleteUser } from "../trpc/user/delete.trpc";
import { createUser } from "../trpc/user/create.trpc";
import { list as listScripts } from "../trpc/script/list.trpc";
import { execute as executeScript } from "../trpc/script/execute.trpc";
import { getSubscriptions } from "../trpc/notifications/getSubscriptions.trpc";
import { saveSubscription } from "../trpc/notifications/saveSubscription.trpc";
import { unsubscribe } from "../trpc/notifications/unsubscribe.trpc";
import { sendNotification } from "../trpc/notifications/sendNotification.trpc";
import { sendPush } from "../trpc/notifications/sendPush.trpc";
import { sendToUser } from "../trpc/notifications/sendToUser.trpc";
import { getPushStatus } from "../trpc/notifications/getPushStatus.trpc";

export const appRouter = router({
  ping,
  auth: router({
    signup,
    login,
    me,
  }),
  user: router({
    list: listUsers,
    create: createUser,
    update: updateUser,
    delete: deleteUser,
  }),
  script: router({
    listScripts: listScripts,
    execute: executeScript,
  }),
  notifications: router({
    getSubscriptions,
    saveSubscription,
    unsubscribe,
    sendNotification,
    sendPush,
    sendToUser,
    getPushStatus,
  }),
});

export type AppRouter = typeof appRouter;
