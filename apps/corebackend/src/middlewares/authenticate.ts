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
  sessionId: string;
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

    // Le jeton n'est valide que tant que sa session l'est (deconnexion = effet immediat).
    const session = await prisma.authSession.findUnique({
      where: { id: claims.sid },
      select: {
        userId: true,
        app: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { id: true, name: true, email: true, role: true, status: true, tokenVersion: true } },
      },
    });
    if (!session || session.revokedAt !== null || session.expiresAt <= new Date()) continue;
    if (session.userId !== claims.sub || session.app !== app) continue;

    const { user } = session;
    if (user.status !== "ACTIVE" || user.tokenVersion !== claims.tv) continue;
    if (!CLIENT_ROLES[app].includes(user.role)) continue;
    return { id: user.id, name: user.name, email: user.email, role: user.role, app, sessionId: claims.sid };
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