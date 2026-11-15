import type { RequestHandler } from "express";
import { clientFromOrigin } from "../config/clients.js";
import { AppError } from "../errors/app-error.js";
import { clearSessionCookie, setSessionCookie } from "../lib/cookies.js";
import { candidateApps, resolveSession } from "../middlewares/authenticate.js";
import * as authService from "../services/auth.service.js";
import { changePasswordSchema, loginSchema } from "../validators/auth.validators.js";

export const login: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body);
  if (clientFromOrigin(req.headers.origin) !== input.client) {
    throw new AppError(403, "ORIGIN_NOT_ALLOWED", "Origine de la requete non autorisee.");
  }
  const { token, user } = await authService.login(input);
  setSessionCookie(res, input.client, token);
  res.status(200).json({ user });
};

export const logout: RequestHandler = async (req, res) => {
  const user = await resolveSession(req);
  if (user) {
    await authService.revokeSessions(user.id);
  }
  for (const app of candidateApps(req.headers.origin)) {
    clearSessionCookie(res, app);
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
  const token = await authService.changePassword(req.user.id, input, req.user.app);
  setSessionCookie(res, req.user.app, token);
  res.status(204).end();
};