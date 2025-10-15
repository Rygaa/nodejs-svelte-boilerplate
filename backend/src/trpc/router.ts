import { router, ping } from "../index";
import { login } from "../trpc/user/login.trpc";
import { signup } from "../trpc/user/signup.trpc";
import { me } from "../trpc/user/me.trpc";
import { list as listUsers } from "../trpc/user/list.trpc";
import { updateUser } from "../trpc/user/update.trpc";
import { deleteUser } from "../trpc/user/delete.trpc";
import { createUser } from "../trpc/user/create.trpc";
import { getIcons } from "../trpc/user/getIcons.trpc";
import { execute as executeScript } from "../trpc/script/execute.trpc";
import { getScripts } from "../trpc/script/getScripts.trpc";
import { updateScriptConfig } from "../trpc/script/updateScriptConfig.trpc";
import { getSubscriptions } from "../trpc/notifications/getSubscriptions.trpc";
import { saveSubscription } from "../trpc/notifications/saveSubscription.trpc";
import { unsubscribe } from "../trpc/notifications/unsubscribe.trpc";
import { sendNotification } from "../trpc/notifications/sendNotification.trpc";
import { sendPush } from "../trpc/notifications/sendPush.trpc";
import { sendToUser } from "../trpc/notifications/sendToUser.trpc";
import { getPushStatus } from "../trpc/notifications/getPushStatus.trpc";
import { createCompany, seedSampleCompanies } from "../trpc/company/create.trpc";
import { listCompanies, getCompanyStats } from "../trpc/company/list.trpc";
import { getFilterValues } from "../trpc/company/filterValues.trpc";
import { checkHunterHealth } from "../trpc/company/health.trpc";
import { getFromHunterIo } from "../trpc/company/getFromHunterIo.trpc";
import { findEmails } from "../trpc/company/findEmails.trpc";
import { getCompanyContactEmails } from "../trpc/company/getContactEmails.trpc";
import { listContexts } from "../trpc/context/list.trpc";
import { getContext } from "../trpc/context/get.trpc";
import { createContext } from "../trpc/context/create.trpc";
import { updateContext } from "../trpc/context/update.trpc";
import { deleteContext } from "../trpc/context/delete.trpc";
import { generateEmail } from "../trpc/companyEmail/generate.trpc";
import { getCompanyEmails } from "../trpc/companyEmail/list.trpc";
import { getProtonConfig } from "../trpc/email/getProtonConfig.trpc";
import { saveProtonConfig } from "../trpc/email/saveProtonConfig.trpc";
import { testConnection } from "../trpc/email/testConnection.trpc";
import { sendTestEmail } from "../trpc/email/sendTestEmail.trpc";

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
    getIcons,
  }),
  script: router({
    execute: executeScript,
    getScripts: getScripts,
    updateConfig: updateScriptConfig,
  }),
  company: router({
    create: createCompany,
    seedSampleCompanies,
    list: listCompanies,
    getStats: getCompanyStats,
    getFilterValues,
    checkHunterHealth,
    getFromHunterIo,
    findEmails,
    getContactEmails: getCompanyContactEmails,
  }),
  context: router({
    list: listContexts,
    get: getContext,
    create: createContext,
    update: updateContext,
    delete: deleteContext,
  }),
  companyEmail: router({
    generate: generateEmail,
    list: getCompanyEmails,
  }),
  email: router({
    getProtonConfig,
    saveProtonConfig,
    testConnection,
    sendTestEmail,
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
