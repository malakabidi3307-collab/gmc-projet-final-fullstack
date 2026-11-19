import type { CookieOptions, Response } from "express";
import { COOKIE_NAMES, REFRESH_COOKIE_NAMES, type ClientApp } from "../config/clients.js";
import { env } from "../config/env.js";
import type { SessionTokens } from "../types/auth.js";

// Le refresh token n'est envoye qu'aux routes d'authentification.
const REFRESH_COOKIE_PATH = "/api/auth";

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production" || env.COOKIE_SAME_SITE === "none",
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setSessionCookies(res: Response, app: ClientApp, tokens: SessionTokens): void {
  const base = baseOptions();
  res.cookie(COOKIE_NAMES[app], tokens.accessToken, { ...base, maxAge: env.ACCESS_TTL_MINUTES * 60 * 1000 });
  res.cookie(REFRESH_COOKIE_NAMES[app], tokens.refreshToken, {
    ...base,
    path: REFRESH_COOKIE_PATH,
    maxAge: Math.max(0, tokens.expiresAt.getTime() - Date.now()),
  });
}

export function clearSessionCookies(res: Response, app: ClientApp): void {
  const base = baseOptions();
  res.clearCookie(COOKIE_NAMES[app], base);
  res.clearCookie(REFRESH_COOKIE_NAMES[app], { ...base, path: REFRESH_COOKIE_PATH });
}