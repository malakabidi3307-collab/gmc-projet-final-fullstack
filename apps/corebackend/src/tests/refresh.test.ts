import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashRefreshToken } from "../lib/refresh-token.js";
import {
  ADMIN_COOKIE,
  ADMIN_ORIGIN,
  TEST_PASSWORD,
  WEB_ORIGIN,
  cookieHeader,
  createUser,
  resetDatabase,
  setCookies,
} from "./helpers.js";

const app = createApp();
const ADMIN_REFRESH = "ifag_admin_refresh";
const WEB_REFRESH = "ifag_web_refresh";
const EMAIL = "admin@test.example";

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

async function loginExisting(email: string) {
  const res = await request(app)
    .post("/api/auth/login")
    .set("Origin", ADMIN_ORIGIN)
    .send({ email, password: TEST_PASSWORD, client: "admin" });
  const access = cookieHeader(res, ADMIN_COOKIE);
  const refresh = cookieHeader(res, ADMIN_REFRESH);
  if (!access || !refresh) throw new Error("Cookies de session absents apres la connexion");
  return { res, access, refresh };
}

async function setup() {
  const user = await createUser({ role: "ADMIN", email: EMAIL });
  return { user, ...(await loginExisting(EMAIL)) };
}

function refreshWith(cookie?: string, origin: string | null = ADMIN_ORIGIN) {
  let req = request(app).post("/api/auth/refresh");
  if (origin) req = req.set("Origin", origin);
  if (cookie) req = req.set("Cookie", cookie);
  return req;
}

const meWith = (cookie: string) =>
  request(app).get("/api/auth/me").set("Origin", ADMIN_ORIGIN).set("Cookie", cookie);

describe("sessions et refresh tokens", () => {
  it("la connexion cree une session et pose deux cookies httpOnly", async () => {
    const { user, res, refresh } = await setup();
    const refreshCookie = setCookies(res).find((c) => c.startsWith(`${ADMIN_REFRESH}=`));
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("SameSite=Lax");
    expect(refreshCookie).toContain("Path=/api/auth");
    const sessions = await prisma.authSession.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(1);
    const token = refresh.slice(ADMIN_REFRESH.length + 1);
    expect(sessions[0].refreshTokenHash).toBe(hashRefreshToken(token));
    expect(sessions[0].refreshTokenHash).not.toBe(token);
    expect(sessions[0].app).toBe("admin");
    expect(JSON.stringify(res.body)).not.toContain(token);
  });

  it("le refresh renouvelle l'acces et fait tourner le refresh token", async () => {
    const { refresh } = await setup();
    const res = await refreshWith(refresh);
    expect(res.status).toBe(200);
    const newAccess = cookieHeader(res, ADMIN_COOKIE);
    const newRefresh = cookieHeader(res, ADMIN_REFRESH);
    expect(newAccess).toBeDefined();
    expect(newRefresh).toBeDefined();
    expect(newRefresh).not.toBe(refresh);
    expect((await meWith(newAccess as string)).status).toBe(200);
  });

  it("refuse un refresh sans cookie et efface les cookies", async () => {
    const res = await refreshWith(undefined);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
    expect(setCookies(res).map((c) => c.split("=")[0])).toContain(ADMIN_REFRESH);
  });

  it("refuse un refresh token inconnu", async () => {
    const res = await refreshWith(`${ADMIN_REFRESH}=token-invente-par-un-attaquant`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("refuse une session expiree", async () => {
    const { user, refresh } = await setup();
    await prisma.authSession.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await refreshWith(refresh)).status).toBe(401);
  });

  it("refuse une session revoquee", async () => {
    const { user, refresh } = await setup();
    await prisma.authSession.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    expect((await refreshWith(refresh)).status).toBe(401);
  });

  it("refuse le refresh d'un compte desactive", async () => {
    const { user, refresh } = await setup();
    await prisma.user.update({ where: { id: user.id }, data: { status: "DISABLED" } });
    expect((await refreshWith(refresh)).status).toBe(401);
  });

  it("refuse le refresh si le role n'est plus autorise dans l'application", async () => {
    const { user, refresh } = await setup();
    await prisma.user.update({ where: { id: user.id }, data: { role: "LEARNER" } });
    expect((await refreshWith(refresh)).status).toBe(401);
  });

  it("detecte la reutilisation d'un ancien refresh token et revoque la session", async () => {
    const { user, refresh } = await setup();
    const rotated = await refreshWith(refresh);
    expect(rotated.status).toBe(200);
    const newAccess = cookieHeader(rotated, ADMIN_COOKIE) as string;
    await prisma.authSession.updateMany({ where: { userId: user.id }, data: { rotatedAt: new Date(Date.now() - 60_000) } });

    const replay = await refreshWith(refresh);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("INVALID_REFRESH_TOKEN");
    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.revokedAt).not.toBeNull();
    expect((await meWith(newAccess)).status).toBe(401);
    expect((await refreshWith(cookieHeader(rotated, ADMIN_REFRESH))).status).toBe(401);
  });

  it("tolere deux refresh simultanes sans revoquer la session", async () => {
    const { user, refresh } = await setup();
    const first = await refreshWith(refresh);
    const second = await refreshWith(refresh);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("REFRESH_CONFLICT");
    expect(setCookies(second)).toHaveLength(0);
    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.revokedAt).toBeNull();
    expect((await refreshWith(cookieHeader(first, ADMIN_REFRESH))).status).toBe(200);
  });

  it("refuse le refresh token d'une application depuis l'autre", async () => {
    const { user, refresh } = await setup();
    const token = refresh.slice(ADMIN_REFRESH.length + 1);
    expect((await refreshWith(refresh, WEB_ORIGIN)).status).toBe(401);
    expect((await refreshWith(`${WEB_REFRESH}=${token}`, WEB_ORIGIN)).status).toBe(401);
    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.revokedAt).toBeNull();
    expect((await refreshWith(refresh)).status).toBe(200);
  });

  it("refuse un refresh sans en-tete Origin", async () => {
    const { refresh } = await setup();
    const res = await refreshWith(refresh, null);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("la deconnexion ne revoque que la session courante", async () => {
    const first = await setup();
    const second = await loginExisting(EMAIL);
    const out = await request(app)
      .post("/api/auth/logout")
      .set("Origin", ADMIN_ORIGIN)
      .set("Cookie", `${first.access}; ${first.refresh}`);
    expect(out.status).toBe(204);
    expect(setCookies(out).map((c) => c.split("=")[0])).toEqual(expect.arrayContaining([ADMIN_COOKIE, ADMIN_REFRESH]));
    expect((await refreshWith(first.refresh)).status).toBe(401);
    expect((await meWith(first.access)).status).toBe(401);
    expect((await refreshWith(second.refresh)).status).toBe(200);
  });

  it("la deconnexion fonctionne avec le seul refresh token (acces expire)", async () => {
    const { refresh } = await setup();
    const out = await request(app).post("/api/auth/logout").set("Origin", ADMIN_ORIGIN).set("Cookie", refresh);
    expect(out.status).toBe(204);
    expect((await refreshWith(refresh)).status).toBe(401);
  });

  it("le changement de mot de passe revoque toutes les sessions et en ouvre une nouvelle", async () => {
    const first = await setup();
    const second = await loginExisting(EMAIL);
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Origin", ADMIN_ORIGIN)
      .set("Cookie", first.access)
      .send({ currentPassword: TEST_PASSWORD, newPassword: "Nouveau-mot-de-passe-2026" });
    expect(res.status).toBe(204);
    const newRefresh = cookieHeader(res, ADMIN_REFRESH);
    expect(newRefresh).toBeDefined();
    expect((await refreshWith(first.refresh)).status).toBe(401);
    expect((await refreshWith(second.refresh)).status).toBe(401);
    expect((await refreshWith(newRefresh)).status).toBe(200);
  });

  it("revoquer la session invalide immediatement le jeton d'acces", async () => {
    const { user, access } = await setup();
    expect((await meWith(access)).status).toBe(200);
    await prisma.authSession.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    expect((await meWith(access)).status).toBe(401);
  });
});