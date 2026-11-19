import request from "supertest";
import { createApp } from "../app.js";
import {
  ADMIN_COOKIE,
  ADMIN_ORIGIN,
  TEST_PASSWORD,
  WEB_COOKIE,
  WEB_ORIGIN,
  cookieHeader,
} from "./helpers.js";

export const app = createApp();

export type Client = "admin" | "web";

export const originOf = (client: Client) => (client === "admin" ? ADMIN_ORIGIN : WEB_ORIGIN);

/** Ouvre une vraie session via /api/auth/login et renvoie le cookie d'acces a renvoyer. */
export async function loginCookie(client: Client, email: string, password: string = TEST_PASSWORD): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .set("Origin", originOf(client))
    .send({ email, password, client });
  const cookie = cookieHeader(res, client === "admin" ? ADMIN_COOKIE : WEB_COOKIE);
  if (!cookie) throw new Error(`Connexion impossible pour ${email} (statut ${res.status})`);
  return cookie;
}