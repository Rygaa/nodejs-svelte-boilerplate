import jwt from "jsonwebtoken";

type User = {
  id: string;
  email: string;
};

async function generateUserToken(user: User): Promise<string> {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

const _UtilsJwt = {
  generateUserToken,
};

export default _UtilsJwt;
