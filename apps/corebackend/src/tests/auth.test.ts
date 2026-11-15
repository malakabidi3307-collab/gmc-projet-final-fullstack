import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { issueAccessToken } from "../lib/tokens.js";
import {
  ADMIN_COOKIE,
  ADMIN_ORIGIN,
  TEST_PASSWORD,
  WEB_COOKIE,
  WEB_ORIGIN,
  cookieHeader,
  createUser,
  resetDatabase,
  setCookies,
} from "./helpers.js";

const app = createApp();

type Client = "admin" | "web";
type RoleName = "ADMIN" | "TRAINER" | "LEARNER";

const originOf = (client: Client) => (client === "admin" ? ADMIN_ORIGIN : WEB_ORIGIN);
const cookieNameOf = (client: Client) => (client === "admin" ? ADMIN_COOKIE : WEB_COOKIE);

function loginAs(client: Client, email: string, password: string = TEST_PASSWORD) {
  return request(app)
    .post("/api/auth/login")
    .set("Origin", originOf(client))
    .send({ email, password, client });
}

async function sessionFor(client: Client, role: RoleName) {
  const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
  const res = await loginAs(client, user.email);
  const cookie = cookieHeader(res, cookieNameOf(client));
  if (!cookie) throw new Error("Cookie de session absent apres la connexion");
  return { user, cookie };
}

function getMe(client: Client, cookie?: string) {
  const req = request(app).get("/api/auth/me").set("Origin", originOf(client));
  return cookie ? req.set("Cookie", cookie) : req;
}

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe("POST /api/auth/login", () => {
  it("connecte un administrateur et pose un cookie httpOnly", async () => {
    const user = await createUser({ role: "ADMIN", email: "admin@test.example" });
    const res = await loginAs("admin", user.email);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: user.id, name: user.name, email: user.email, role: "ADMIN" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    const cookie = setCookies(res).find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Secure");
  });

  it("connecte un formateur via l'application web", async () => {
    const user = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const res = await loginAs("web", user.email);
    expect(res.status).toBe(200);
    expect(cookieHeader(res, WEB_COOKIE)).toBeDefined();
  });

  it("normalise l'adresse e-mail (espaces et majuscules)", async () => {
    await createUser({ role: "ADMIN", email: "admin@test.example" });
    const res = await loginAs("admin", "  ADMIN@Test.example ");
    expect(res.status).toBe(200);
  });

  it("renvoie la meme reponse pour un compte inconnu et un mauvais mot de passe", async () => {
    const user = await createUser({ role: "ADMIN", email: "admin@test.example" });
    const unknown = await loginAs("admin", "inconnu@test.example");
    const wrong = await loginAs("admin", user.email, "mauvais-mot-de-passe");
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknown.body).toEqual(wrong.body);
  });

  it("refuse un corps de requete invalide", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", ADMIN_ORIGIN)
      .send({ email: "pas-un-email", client: "admin" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("refuse un administrateur sur l'application web", async () => {
    const user = await createUser({ role: "ADMIN", email: "admin@test.example" });
    const res = await loginAs("web", user.email);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_CLIENT");
    expect(setCookies(res)).toHaveLength(0);
  });

  it("refuse un apprenant sur l'application admin", async () => {
    const user = await createUser({ role: "LEARNER", email: "learner@test.example" });
    const res = await loginAs("admin", user.email);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_CLIENT");
  });

  it.each(["DISABLED", "PENDING"] as const)("refuse un compte %s avec le bon mot de passe", async (status) => {
    const user = await createUser({ role: "ADMIN", email: "admin@test.example", status });
    const res = await loginAs("admin", user.email);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(setCookies(res)).toHaveLength(0);
  });

  it("verrouille le compte apres 5 echecs, meme avec le bon mot de passe", async () => {
    const user = await createUser({ role: "ADMIN", email: "admin@test.example" });
    for (let i = 0; i < 5; i++) {
      const res = await loginAs("admin", user.email, "mauvais-mot-de-passe");
      expect(res.status).toBe(401);
    }
    const locked = await loginAs("admin", user.email);
    expect(locked.status).toBe(401);
    expect(setCookies(locked)).toHaveLength(0);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.lockedUntil !== null && stored.lockedUntil.getTime() > Date.now()).toBe(true);
  });

  it("remet le compteur d'echecs a zero apres une connexion reussie", async () => {
    const user = await createUser({ role: "ADMIN", email: "admin@test.example" });
    await loginAs("admin", user.email, "mauvais-1");
    await loginAs("admin", user.email, "mauvais-2");
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(before.failedLoginCount).toBe(2);
    const ok = await loginAs("admin", user.email);
    expect(ok.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.failedLoginCount).toBe(0);
    expect(after.lastLoginAt).not.toBeNull();
  });

  it("refuse une requete sans en-tete Origin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@test.example", password: TEST_PASSWORD, client: "admin" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("refuse une origine inconnue", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://evil.example")
      .send({ email: "a@test.example", password: TEST_PASSWORD, client: "admin" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("refuse un client qui ne correspond pas a l'origine", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", ADMIN_ORIGIN)
      .send({ email: "a@test.example", password: TEST_PASSWORD, client: "web" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });
});

describe("GET /api/auth/me", () => {
  it("refuse une requete sans cookie", async () => {
    const res = await getMe("admin");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("renvoie l'utilisateur connecte", async () => {
    const { user, cookie } = await sessionFor("admin", "ADMIN");
    const res = await getMe("admin", cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.role).toBe("ADMIN");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("refuse un jeton altere", async () => {
    const { cookie } = await sessionFor("admin", "ADMIN");
    const token = cookie.slice(ADMIN_COOKIE.length + 1);
    const parts = token.split(".");
    parts[2] = (parts[2].startsWith("A") ? "B" : "A") + parts[2].slice(1);
    const res = await getMe("admin", `${ADMIN_COOKIE}=${parts.join(".")}`);
    expect(res.status).toBe(401);
  });

  it("refuse un jeton expire", async () => {
    const user = await createUser({ role: "ADMIN", email: "admin@test.example" });
    const token = await issueAccessToken(user, "admin", { ttlSeconds: -10 });
    const res = await getMe("admin", `${ADMIN_COOKIE}=${token}`);
    expect(res.status).toBe(401);
  });

  it("refuse un jeton dont la version a ete revoquee", async () => {
    const { user, cookie } = await sessionFor("admin", "ADMIN");
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
    const res = await getMe("admin", cookie);
    expect(res.status).toBe(401);
  });

  it("refuse la session d'un compte desactive apres la connexion", async () => {
    const { user, cookie } = await sessionFor("admin", "ADMIN");
    await prisma.user.update({ where: { id: user.id }, data: { status: "DISABLED" } });
    const res = await getMe("admin", cookie);
    expect(res.status).toBe(401);
  });

  it("n'accepte pas le cookie d'une application depuis l'autre", async () => {
    const { cookie } = await sessionFor("admin", "ADMIN");
    const res = await getMe("web", cookie);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("revoque la session et efface le cookie de l'application courante", async () => {
    const { cookie } = await sessionFor("admin", "ADMIN");
    const out = await request(app).post("/api/auth/logout").set("Origin", ADMIN_ORIGIN).set("Cookie", cookie);
    expect(out.status).toBe(204);
    const cleared = setCookies(out).find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
    expect(setCookies(out).some((c) => c.startsWith(`${WEB_COOKIE}=`))).toBe(false);
    const me = await getMe("admin", cookie);
    expect(me.status).toBe(401);
  });

  it("repond 204 meme sans session", async () => {
    const res = await request(app).post("/api/auth/logout").set("Origin", ADMIN_ORIGIN);
    expect(res.status).toBe(204);
  });
});

describe("POST /api/auth/change-password", () => {
  const changePassword = (cookie: string | undefined, body: object) => {
    const req = request(app).post("/api/auth/change-password").set("Origin", WEB_ORIGIN);
    return (cookie ? req.set("Cookie", cookie) : req).send(body);
  };
  const newPassword = "Nouveau-mot-de-passe-2026";

  it("refuse un utilisateur non connecte", async () => {
    const res = await changePassword(undefined, { currentPassword: TEST_PASSWORD, newPassword });
    expect(res.status).toBe(401);
  });

  it("refuse un mot de passe actuel incorrect", async () => {
    const { cookie } = await sessionFor("web", "LEARNER");
    const res = await changePassword(cookie, { currentPassword: "incorrect-password", newPassword });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("refuse un nouveau mot de passe trop court", async () => {
    const { cookie } = await sessionFor("web", "LEARNER");
    const res = await changePassword(cookie, { currentPassword: TEST_PASSWORD, newPassword: "court" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("refuse un nouveau mot de passe identique a l'ancien", async () => {
    const { cookie } = await sessionFor("web", "LEARNER");
    const res = await changePassword(cookie, { currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PASSWORD_UNCHANGED");
  });

  it("change le mot de passe, revoque l'ancienne session et en ouvre une nouvelle", async () => {
    const { user, cookie } = await sessionFor("web", "LEARNER");
    const res = await changePassword(cookie, { currentPassword: TEST_PASSWORD, newPassword });
    expect(res.status).toBe(204);
    const newCookie = cookieHeader(res, WEB_COOKIE);
    expect(newCookie).toBeDefined();

    expect((await getMe("web", cookie)).status).toBe(401);
    expect((await getMe("web", newCookie as string)).status).toBe(200);
    expect((await loginAs("web", user.email)).status).toBe(401);
    expect((await loginAs("web", user.email, newPassword)).status).toBe(200);
  });
});