import type { Request, RequestHandler } from "express";
import { REFRESH_COOKIE_NAMES, clientFromOrigin } from "../config/clients.js";
import { AppError } from "../errors/app-error.js";
import { clearSessionCookies, setSessionCookies } from "../lib/cookies.js";
import { candidateApps, resolveSession } from "../middlewares/authenticate.js";
import * as authService from "../services/auth.service.js";
import { changePasswordSchema, loginSchema } from "../validators/auth.validators.js";

const userAgentOf = (req: Request): string | undefined => req.get("user-agent") ?? undefined;
const refreshTokenOf = (req: Request, app: "web" | "admin"): string => {
  const value = ((req.cookies ?? {}) as Record<string, unknown>)[REFRESH_COOKIE_NAMES[app]];
  return typeof value === "string" ? value : "";
};

export const login: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body);
  if (clientFromOrigin(req.headers.origin) !== input.client) {
    throw new AppError(403, "ORIGIN_NOT_ALLOWED", "Origine de la requete non autorisee.");
  }
  const { tokens, user } = await authService.login(input, userAgentOf(req));
  setSessionCookies(res, input.client, tokens);
  res.status(200).json({ user });
};

export const refresh: RequestHandler = async (req, res) => {
  const app = clientFromOrigin(req.headers.origin);
  if (!app) {
    throw new AppError(403, "ORIGIN_NOT_ALLOWED", "Origine de la requete non autorisee.");
  }
  try {
    const { tokens, user } = await authService.refresh(app, refreshTokenOf(req, app));
    setSessionCookies(res, app, tokens);
    res.status(200).json({ user });
  } catch (error) {
    // On n'efface les cookies que pour un echec definitif : un conflit (409) ne doit pas
    // supprimer les cookies que la requete concurrente vient de poser.
    if (error instanceof AppError && error.code === "INVALID_REFRESH_TOKEN") {
      clearSessionCookies(res, app);
    }
    throw error;
  }
};

export const logout: RequestHandler = async (req, res) => {
  const user = await resolveSession(req);
  if (user) {
    await authService.revokeSession(user.sessionId);
  }
  for (const app of candidateApps(req.headers.origin)) {
    const token = refreshTokenOf(req, app);
    if (token) {
      await authService.revokeByRefreshToken(app, token);
    }
    clearSessionCookies(res, app);
  }
  res.status(204).end();
};

export const me: RequestHandler = (req, res) => {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
  }
  const { id, name, email, role } = req.user;
  res.status(200).json({ user: { id, name, email, role } });
};

export const changePassword: RequestHandler = async (req, res) => {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
  }
  const input = changePasswordSchema.parse(req.body);
  const tokens = await authService.changePassword(req.user.id, input, req.user.app, userAgentOf(req));
  setSessionCookies(res, req.user.app, tokens);
  res.status(204).end();
};