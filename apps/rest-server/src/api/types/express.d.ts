import { JwtPayload } from "jsonwebtoken";
import { type User } from "@baatcheet/db"

export type UserPayload = JwtPayload & Pick<User, "userId" | "username" | "name">;

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}