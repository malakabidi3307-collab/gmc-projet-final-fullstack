import type { AuthUser } from "../middlewares/authenticate.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};