import type { Request, RequestHandler } from "express";
import {
  CLIENT_ROLES,
  COOKIE_NAMES,
  clientFromOrigin,
  type ClientApp,
  type RoleName,
} from "../config/clients.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../lib/tokens.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  app: ClientApp;
}

/** L'origine designe l'application ; sans origine reconnue, on essaie les deux cookies. */
export function candidateApps(origin: string | undefined): ClientApp[] {
  const app = clientFromOrigin(origin);
  return app ? [app] : ["admin", "web"];
}

export async function resolveSession(req: Request): Promise<AuthUser | null> {
  const cookies = (req.cookies ?? {}) as Record<string, unknown>;
  for (const app of candidateApps(req.headers.origin)) {
    const token = cookies[COOKIE_NAMES[app]];
    if (typeof token !== "string" || token === "") continue;
    const claims = await verifyAccessToken(token, app);
    if (!claims) continue;
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, name: true, email: true, role: true, status: true, tokenVersion: true },
    });
    if (!user || user.status !== "ACTIVE" || user.tokenVersion !== claims.tv) continue;
    if (!CLIENT_ROLES[app].includes(user.role)) continue;
    return { id: user.id, name: user.name, email: user.email, role: user.role, app };
  }
  return null;
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  const user = await resolveSession(req);
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
  }
  req.user = user;
  next();
};

export function requireRole(...roles: RoleName[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentification requise."));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "FORBIDDEN", "Acces refuse."));
      return;
    }
    next();
  };
}