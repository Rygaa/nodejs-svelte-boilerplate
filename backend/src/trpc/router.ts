import { router, ping, giveMeRandomNumber } from "../index";
import { auth, signup, login } from "./users";

export const appRouter = router({
  ping,
  giveMeRandomNumber,
  signup,
  login,
  auth,
});

export type AppRouter = typeof appRouter;
