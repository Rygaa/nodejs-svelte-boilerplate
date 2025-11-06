import { router, ping, giveMeRandomNumber, heartbeat } from "../index";
import { getAllUsers, createUser, updateUser, deleteUser } from "./admin/users";
import { auth, login, signup, updateMyPassword } from "./user/users";

export const appRouter = router({
  ping,
  heartbeat,
  giveMeRandomNumber,
  signup,
  login,
  auth,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateMyPassword,
});

export type AppRouter = typeof appRouter;
