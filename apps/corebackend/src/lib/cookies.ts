import type { CookieOptions, Response } from "express";
import { COOKIE_NAMES, type ClientApp } from "../config/clients.js";
import { env } from "../config/env.js";

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production" || env.COOKIE_SAME_SITE === "none",
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setSessionCookie(res: Response, app: ClientApp, token: string): void {
  res.cookie(COOKIE_NAMES[app], token, { ...baseOptions(), maxAge: env.SESSION_TTL_MINUTES * 60 * 1000 });
}

export function clearSessionCookie(res: Response, app: ClientApp): void {
  res.clearCookie(COOKIE_NAMES[app], baseOptions());
}