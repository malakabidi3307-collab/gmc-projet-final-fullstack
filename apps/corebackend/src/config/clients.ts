import { env } from "./env.js";

export type ClientApp = "web" | "admin";
export type RoleName = "ADMIN" | "TRAINER" | "LEARNER";

// Roles metier autorises a se connecter dans chaque application frontend.
export const CLIENT_ROLES: Record<ClientApp, readonly RoleName[]> = {
  admin: ["ADMIN"],
  web: ["TRAINER", "LEARNER"],
};

// Un jeu de cookies par application : les cookies de localhost sont partages entre les ports.
export const COOKIE_NAMES: Record<ClientApp, string> = {
  admin: "ifag_admin_session",
  web: "ifag_web_session",
};

export const REFRESH_COOKIE_NAMES: Record<ClientApp, string> = {
  admin: "ifag_admin_refresh",
  web: "ifag_web_refresh",
};

const ORIGINS: Record<ClientApp, string> = { web: env.WEB_ORIGIN, admin: env.ADMIN_ORIGIN };

export function clientFromOrigin(origin: string | undefined): ClientApp | undefined {
  return (Object.keys(ORIGINS) as ClientApp[]).find((app) => ORIGINS[app] === origin);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  return clientFromOrigin(origin) !== undefined;
}