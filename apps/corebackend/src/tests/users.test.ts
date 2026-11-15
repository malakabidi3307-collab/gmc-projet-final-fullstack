import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { ADMIN_ORIGIN, WEB_ORIGIN, createUser, resetDatabase } from "./helpers.js";
import { app, loginCookie } from "./session-helpers.js";

type Method = "get" | "post" | "patch";

function call(method: Method, path: string, options: { cookie?: string; origin?: string } = {}) {
  const req = request(app)[method](path).set("Origin", options.origin ?? ADMIN_ORIGIN);
  return options.cookie ? req.set("Cookie", options.cookie) : req;
}

const SENSITIVE = ["passwordHash", "tokenVersion", "failedLoginCount", "lockedUntil"];

function expectNoSensitiveFields(body: unknown): void {
  const text = JSON.stringify(body);
  for (const field of SENSITIVE) {
    expect(text).not.toContain(field);
  }
}

async function adminSession() {
  const admin = await createUser({ role: "ADMIN", email: "zadmin@test.example", name: "Admin Test" });
  const cookie = await loginCookie("admin", admin.email);
  return { admin, cookie };
}

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe("acces reserve aux administrateurs", () => {
  it("refuse une requete sans session", async () => {
    const res = await call("get", "/api/users");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la liste a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const cookie = await loginCookie("web", user.email);
    const res = await call("get", "/api/users", { cookie, origin: WEB_ORIGIN });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("empeche un apprenant de s'attribuer le role ADMIN", async () => {
    const learner = await createUser({ role: "LEARNER", email: "learner@test.example" });
    const cookie = await loginCookie("web", learner.email);
    const res = await call("patch", `/api/users/${learner.id}`, { cookie, origin: WEB_ORIGIN }).send({ role: "ADMIN" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: learner.id } });
    expect(stored.role).toBe("LEARNER");
  });

  it("empeche un formateur de creer un utilisateur", async () => {
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const cookie = await loginCookie("web", trainer.email);
    const res = await call("post", "/api/users", { cookie, origin: WEB_ORIGIN }).send({
      name: "Pirate",
      email: "pirate@test.example",
      role: "ADMIN",
      password: "Mot-de-passe-solide-1",
    });
    expect(res.status).toBe(403);
    expect(await prisma.user.count({ where: { email: "pirate@test.example" } })).toBe(0);
  });
});

describe("GET /api/users", () => {
  it("renvoie une liste paginee et triee, sans champ sensible", async () => {
    const { cookie } = await adminSession();
    for (const email of ["b1@test.example", "b2@test.example", "b3@test.example"]) {
      await createUser({ role: "LEARNER", email });
    }
    const first = await call("get", "/api/users?page=1&pageSize=2&sort=email&order=asc", { cookie });
    expect(first.status).toBe(200);
    expect(first.body.data.map((u: { email: string }) => u.email)).toEqual(["b1@test.example", "b2@test.example"]);
    expect(first.body.meta).toEqual({ page: 1, pageSize: 2, total: 4, totalPages: 2 });
    expectNoSensitiveFields(first.body);

    const second = await call("get", "/api/users?page=2&pageSize=2&sort=email&order=asc", { cookie });
    expect(second.body.data.map((u: { email: string }) => u.email)).toEqual(["b3@test.example", "zadmin@test.example"]);
  });

  it("filtre par role", async () => {
    const { cookie } = await adminSession();
    await createUser({ role: "TRAINER", email: "trainer@test.example" });
    await createUser({ role: "LEARNER", email: "l1@test.example" });
    await createUser({ role: "LEARNER", email: "l2@test.example" });
    const res = await call("get", "/api/users?role=TRAINER", { cookie });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].role).toBe("TRAINER");
  });

  it("recherche par nom ou e-mail sans tenir compte de la casse", async () => {
    const { cookie } = await adminSession();
    await createUser({ role: "LEARNER", email: "amina.m@test.example", name: "Amina Meziane" });
    await createUser({ role: "LEARNER", email: "autre@test.example", name: "Karim Haddad" });
    const res = await call("get", "/api/users?q=AMINA", { cookie });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].email).toBe("amina.m@test.example");
  });

  it("refuse des parametres invalides", async () => {
    const { cookie } = await adminSession();
    for (const query of ["pageSize=1000", "role=SUPERUSER", "page=0"]) {
      const res = await call("get", `/api/users?${query}`, { cookie });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("GET /api/users/:id", () => {
  it("renvoie l'utilisateur demande", async () => {
    const { cookie } = await adminSession();
    const target = await createUser({ role: "LEARNER", email: "target@test.example" });
    const res = await call("get", `/api/users/${target.id}`, { cookie });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: target.id, email: "target@test.example", role: "LEARNER", status: "ACTIVE" });
    expectNoSensitiveFields(res.body);
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("get", "/api/users/identifiant-inexistant", { cookie });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });
});

describe("POST /api/users", () => {
  const password = "Mot-de-passe-solide-1";

  it("cree un utilisateur, normalise l'e-mail, hache le mot de passe et permet la connexion", async () => {
    const { cookie } = await adminSession();
    const res = await call("post", "/api/users", { cookie }).send({
      name: "Nouvel Apprenant",
      email: "  New.Learner@Test.example ",
      role: "LEARNER",
      password,
      phone: "0555 12 34 56",
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: "new.learner@test.example",
      role: "LEARNER",
      status: "ACTIVE",
      phone: "0555 12 34 56",
    });
    expectNoSensitiveFields(res.body);
    expect(JSON.stringify(res.body)).not.toContain(password);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "new.learner@test.example" } });
    expect(stored.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(await loginCookie("web", "new.learner@test.example", password)).toContain("ifag_web_session=");
  });

  it("refuse un e-mail deja utilise, sans tenir compte de la casse", async () => {
    const { cookie } = await adminSession();
    await createUser({ role: "LEARNER", email: "taken@test.example" });
    const res = await call("post", "/api/users", { cookie }).send({
      name: "Doublon",
      email: "TAKEN@test.example",
      role: "LEARNER",
      password,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("refuse un mot de passe trop court", async () => {
    const { cookie } = await adminSession();
    const res = await call("post", "/api/users", { cookie }).send({
      name: "Court",
      email: "court@test.example",
      role: "LEARNER",
      password: "court",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("refuse les champs inconnus (protection contre l'assignation de masse)", async () => {
    const { cookie } = await adminSession();
    const res = await call("post", "/api/users", { cookie }).send({
      name: "Intrus",
      email: "intrus@test.example",
      role: "LEARNER",
      password,
      tokenVersion: 99,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.user.count({ where: { email: "intrus@test.example" } })).toBe(0);
  });

  it("refuse un role invalide", async () => {
    const { cookie } = await adminSession();
    const res = await call("post", "/api/users", { cookie }).send({
      name: "Role Invalide",
      email: "role@test.example",
      role: "SUPERUSER",
      password,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /api/users/:id", () => {
  it("met a jour le nom, le telephone et la specialite", async () => {
    const { cookie } = await adminSession();
    const target = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const res = await call("patch", `/api/users/${target.id}`, { cookie }).send({
      name: "Nom Modifie",
      phone: "0661 00 00 00",
      specialty: "Comptabilite",
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: "Nom Modifie", phone: "0661 00 00 00", specialty: "Comptabilite" });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(stored.name).toBe("Nom Modifie");
    expect(stored.specialty).toBe("Comptabilite");
  });

  it("refuse un corps vide", async () => {
    const { cookie } = await adminSession();
    const target = await createUser({ role: "LEARNER", email: "target@test.example" });
    const res = await call("patch", `/api/users/${target.id}`, { cookie }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("patch", "/api/users/identifiant-inexistant", { cookie }).send({ name: "Fantome" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("refuse a un administrateur de modifier son propre role", async () => {
    const { admin, cookie } = await adminSession();
    const res = await call("patch", `/api/users/${admin.id}`, { cookie }).send({ role: "LEARNER" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SELF_MODIFICATION_FORBIDDEN");
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(stored.role).toBe("ADMIN");
  });

  it("refuse a un administrateur de se desactiver lui-meme", async () => {
    const { admin, cookie } = await adminSession();
    const res = await call("patch", `/api/users/${admin.id}`, { cookie }).send({ status: "DISABLED" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SELF_MODIFICATION_FORBIDDEN");
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(stored.status).toBe("ACTIVE");
  });

  it("autorise un administrateur a modifier son propre nom", async () => {
    const { admin, cookie } = await adminSession();
    const res = await call("patch", `/api/users/${admin.id}`, { cookie }).send({ name: "Nouveau Nom" });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Nouveau Nom");
  });

  it("desactiver un compte revoque ses sessions", async () => {
    const { cookie } = await adminSession();
    const target = await createUser({ role: "LEARNER", email: "learner@test.example" });
    const targetCookie = await loginCookie("web", target.email);
    const before = await call("get", "/api/auth/me", { cookie: targetCookie, origin: WEB_ORIGIN });
    expect(before.status).toBe(200);

    const res = await call("patch", `/api/users/${target.id}`, { cookie }).send({ status: "DISABLED" });
    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe("DISABLED");

    const after = await call("get", "/api/auth/me", { cookie: targetCookie, origin: WEB_ORIGIN });
    expect(after.status).toBe(401);
    const sessions = await prisma.authSession.findMany({ where: { userId: target.id } });
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
  });

  it("changer le role d'un utilisateur invalide sa session", async () => {
    const { cookie } = await adminSession();
    const target = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const targetCookie = await loginCookie("web", target.email);
    expect((await call("get", "/api/auth/me", { cookie: targetCookie, origin: WEB_ORIGIN })).status).toBe(200);

    const res = await call("patch", `/api/users/${target.id}`, { cookie }).send({ role: "ADMIN" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ADMIN");
    expect((await call("get", "/api/auth/me", { cookie: targetCookie, origin: WEB_ORIGIN })).status).toBe(401);
  });

  it("refuse un e-mail deja utilise par un autre compte", async () => {
    const { cookie } = await adminSession();
    await createUser({ role: "LEARNER", email: "taken@test.example" });
    const target = await createUser({ role: "LEARNER", email: "target@test.example" });
    const res = await call("patch", `/api/users/${target.id}`, { cookie }).send({ email: "taken@test.example" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("normalise un nouvel e-mail", async () => {
    const { cookie } = await adminSession();
    const target = await createUser({ role: "LEARNER", email: "target@test.example" });
    const res = await call("patch", `/api/users/${target.id}`, { cookie }).send({ email: "  NEW@Test.Example " });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("new@test.example");
  });
});