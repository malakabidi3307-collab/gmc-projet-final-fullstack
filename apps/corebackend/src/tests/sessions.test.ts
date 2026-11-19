import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { createCourse, enroll } from "./course-helpers.js";
import { createLearner, createSessionWith, markPresent } from "./enrollment-helpers.js";
import { ADMIN_ORIGIN, WEB_ORIGIN, createUser, resetDatabase } from "./helpers.js";
import { app, loginCookie } from "./session-helpers.js";

type Method = "get" | "post" | "patch" | "delete";
type Client = "admin" | "web";

const BASE = "/api/training-sessions";

function call(method: Method, path: string, options: { cookie?: string; client?: Client } = {}) {
  const origin = options.client === "web" ? WEB_ORIGIN : ADMIN_ORIGIN;
  const req = request(app)[method](path).set("Origin", origin);
  return options.cookie ? req.set("Cookie", options.cookie) : req;
}

const ids = (res: { body: { data: { id: string }[] } }) => res.body.data.map((item) => item.id);
const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const validBody = (courseId: string, extra: Record<string, unknown> = {}) => ({
  courseId,
  startsAt: inHours(24),
  endsAt: inHours(26),
  location: "Salle A1",
  capacity: 15,
  ...extra,
});

async function adminSession() {
  const admin = await createUser({ role: "ADMIN", email: "zadmin@test.example" });
  return { admin, cookie: await loginCookie("admin", admin.email) };
}

async function trainerSession(email = "trainer@test.example", name = "Sara Benali") {
  const trainer = await createUser({ role: "TRAINER", email, name });
  return { trainer, cookie: await loginCookie("web", trainer.email) };
}

async function learnerSession(email = "learner@test.example") {
  const learner = await createUser({ role: "LEARNER", email });
  return { learner, cookie: await loginCookie("web", learner.email) };
}

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe("acces et visibilite des sessions", () => {
  it("refuse une requete sans session", async () => {
    const res = await call("get", BASE);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("l'administrateur voit toutes les sessions, y compris celles d'un brouillon", async () => {
    const { cookie } = await adminSession();
    const published = await createCourse({ name: "Publiee" });
    const draft = await createCourse({ name: "Brouillon", status: "DRAFT" });
    const s1 = await createSessionWith(published.id, { startsInHours: 24 });
    const s2 = await createSessionWith(draft.id, { startsInHours: 48 });
    const res = await call("get", BASE, { cookie });
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([s1.id, s2.id]);
  });

  it("le formateur voit les sessions des formations de son perimetre, hors brouillons", async () => {
    const { trainer, cookie } = await trainerSession();
    const other = await createUser({ role: "TRAINER", email: "other@test.example" });
    const own = await createCourse({ name: "A", trainerId: trainer.id });
    const animated = await createCourse({ name: "B", trainerId: other.id });
    const foreign = await createCourse({ name: "C", trainerId: other.id });
    const draft = await createCourse({ name: "D", trainerId: trainer.id, status: "DRAFT" });
    const s1 = await createSessionWith(own.id, { startsInHours: 1 });
    const s2 = await createSessionWith(animated.id, { trainerId: trainer.id, startsInHours: 2 });
    const s3 = await createSessionWith(animated.id, { trainerId: other.id, startsInHours: 3 });
    await createSessionWith(foreign.id, { trainerId: other.id, startsInHours: 4 });
    await createSessionWith(draft.id, { trainerId: trainer.id, startsInHours: 5 });
    const res = await call("get", BASE, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([s1.id, s2.id, s3.id]);
  });

  it("l'apprenant ne voit que les sessions des formations ou il est inscrit (hors annulees et brouillons)", async () => {
    const { learner, cookie } = await learnerSession();
    const mine = await createCourse({ name: "A" });
    const cancelled = await createCourse({ name: "B" });
    const notEnrolled = await createCourse({ name: "C" });
    const draft = await createCourse({ name: "D", status: "DRAFT" });
    const s1 = await createSessionWith(mine.id, { startsInHours: 1 });
    await createSessionWith(cancelled.id, { startsInHours: 2 });
    await createSessionWith(notEnrolled.id, { startsInHours: 3 });
    await createSessionWith(draft.id, { startsInHours: 4 });
    await enroll(learner.id, mine.id, "CONFIRMED");
    await enroll(learner.id, cancelled.id, "CANCELLED");
    await enroll(learner.id, draft.id, "CONFIRMED");
    const res = await call("get", BASE, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([s1.id]);
  });
});

describe("GET /api/training-sessions/:id", () => {
  it("renvoie le detail avec formation et formateur limites a id et nom", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example", name: "Sara Benali" });
    const course = await createCourse({ name: "Compta" });
    const session = await createSessionWith(course.id, { trainerId: trainer.id });
    const res = await call("get", `${BASE}/${session.id}`, { cookie });
    expect(res.status).toBe(200);
    expect(res.body.session).toMatchObject({ id: session.id, location: "Salle B2", capacity: 20 });
    expect(res.body.session.course).toEqual({ id: course.id, name: "Compta" });
    expect(res.body.session.trainer).toEqual({ id: trainer.id, name: "Sara Benali" });
  });

  it("l'apprenant inscrit voit la session", async () => {
    const { learner, cookie } = await learnerSession();
    const course = await createCourse({ name: "Ma formation" });
    const session = await createSessionWith(course.id);
    await enroll(learner.id, course.id);
    const res = await call("get", `${BASE}/${session.id}`, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(session.id);
  });

  it("l'apprenant non inscrit ne voit pas la session (404)", async () => {
    const { cookie } = await learnerSession();
    const course = await createCourse({ name: "Pas la mienne" });
    const session = await createSessionWith(course.id);
    const res = await call("get", `${BASE}/${session.id}`, { cookie, client: "web" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("get", `${BASE}/identifiant-inexistant`, { cookie });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
  });
});

describe("filtres, tri et pagination des sessions", () => {
  it("filtre par formation et par formateur", async () => {
    const { cookie } = await adminSession();
    const t1 = await createUser({ role: "TRAINER", email: "t1@test.example" });
    const c1 = await createCourse({ name: "C1" });
    const c2 = await createCourse({ name: "C2" });
    const s1 = await createSessionWith(c1.id, { trainerId: t1.id, startsInHours: 1 });
    const s2 = await createSessionWith(c2.id, { startsInHours: 2 });
    const byCourse = await call("get", `${BASE}?courseId=${c2.id}`, { cookie });
    expect(ids(byCourse)).toEqual([s2.id]);
    const byTrainer = await call("get", `${BASE}?trainerId=${t1.id}`, { cookie });
    expect(ids(byTrainer)).toEqual([s1.id]);
  });

  it("refuse des parametres invalides", async () => {
    const { cookie } = await adminSession();
    for (const query of ["pageSize=500", "sort=location", "page=0", "order=up"]) {
      const res = await call("get", `${BASE}?${query}`, { cookie });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("POST /api/training-sessions", () => {
  it("cree une session avec son formateur et la persiste", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example", name: "Sara Benali" });
    const course = await createCourse({ name: "Compta" });
    const res = await call("post", BASE, { cookie }).send(
      validBody(course.id, { location: "  Salle C3 ", trainerId: trainer.id }),
    );
    expect(res.status).toBe(201);
    expect(res.body.session).toMatchObject({
      location: "Salle C3",
      capacity: 15,
      course: { id: course.id, name: "Compta" },
      trainer: { id: trainer.id, name: "Sara Benali" },
    });
    const stored = await prisma.trainingSession.findUniqueOrThrow({ where: { id: res.body.session.id } });
    expect(stored.courseId).toBe(course.id);
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la creation a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const cookie = await loginCookie("web", user.email);
    const course = await createCourse({ name: "Formation" });
    const res = await call("post", BASE, { cookie, client: "web" }).send(validBody(course.id));
    expect(res.status).toBe(403);
    expect(await prisma.trainingSession.count()).toBe(0);
  });

  it("refuse des donnees invalides ou inconnues", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const invalidBodies = [
      validBody(course.id, { location: "A" }),
      validBody(course.id, { capacity: 0 }),
      validBody(course.id, { capacity: 12.5 }),
      validBody(course.id, { startsAt: "demain" }),
      validBody(course.id, { room: "X" }),
      { ...validBody(course.id), courseId: undefined },
    ];
    for (const body of invalidBodies) {
      const res = await call("post", BASE, { cookie }).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
    expect(await prisma.trainingSession.count()).toBe(0);
  });

  it("refuse une date de fin qui n'est pas posterieure au debut", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const start = inHours(24);
    for (const endsAt of [inHours(23), start]) {
      const res = await call("post", BASE, { cookie }).send(validBody(course.id, { startsAt: start, endsAt }));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_DATES");
    }
    expect(await prisma.trainingSession.count()).toBe(0);
  });

  it("renvoie 404 si la formation n'existe pas", async () => {
    const { cookie } = await adminSession();
    const res = await call("post", BASE, { cookie }).send(validBody("identifiant-inexistant"));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("COURSE_NOT_FOUND");
  });

  it("refuse une session sur une formation archivee (409)", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Archivee", status: "ARCHIVED" });
    const res = await call("post", BASE, { cookie }).send(validBody(course.id));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("COURSE_ARCHIVED");
  });

  it("refuse un formateur invalide (apprenant, desactive ou inconnu)", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const learner = await createUser({ role: "LEARNER", email: "learner@test.example" });
    const disabled = await createUser({ role: "TRAINER", email: "disabled@test.example", status: "DISABLED" });
    for (const trainerId of [learner.id, disabled.id, "identifiant-inexistant"]) {
      const res = await call("post", BASE, { cookie }).send(validBody(course.id, { trainerId }));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TRAINER");
    }
    expect(await prisma.trainingSession.count()).toBe(0);
  });

  it("refuse une capacite inferieure au nombre d'inscriptions actives (409)", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    await enroll(l0.id, course.id, "CONFIRMED");
    await enroll(l1.id, course.id, "PENDING");
    await enroll(l2.id, course.id, "CANCELLED");
    const refused = await call("post", BASE, { cookie }).send(validBody(course.id, { capacity: 1 }));
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("CAPACITY_TOO_LOW");
    expect(await prisma.trainingSession.count()).toBe(0);
    const accepted = await call("post", BASE, { cookie }).send(validBody(course.id, { capacity: 2 }));
    expect(accepted.status).toBe(201);
  });
});

describe("PATCH /api/training-sessions/:id", () => {
  it("met a jour les champs et affecte un formateur", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example", name: "Sara Benali" });
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id);
    const res = await call("patch", `${BASE}/${session.id}`, { cookie }).send({
      location: "Salle D4",
      capacity: 30,
      startsAt: inHours(48),
      endsAt: inHours(50),
      trainerId: trainer.id,
    });
    expect(res.status).toBe(200);
    expect(res.body.session).toMatchObject({
      location: "Salle D4",
      capacity: 30,
      trainer: { id: trainer.id, name: "Sara Benali" },
    });
  });

  it("retire le formateur avec trainerId null", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id, { trainerId: trainer.id });
    const res = await call("patch", `${BASE}/${session.id}`, { cookie }).send({ trainerId: null });
    expect(res.status).toBe(200);
    expect(res.body.session.trainer).toBeNull();
  });

  it("refuse une capacite sous le nombre d'inscriptions actives, accepte l'egalite", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id, { capacity: 20 });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    await enroll(l0.id, course.id, "CONFIRMED");
    await enroll(l1.id, course.id, "PENDING");
    await enroll(l2.id, course.id, "CANCELLED");
    const refused = await call("patch", `${BASE}/${session.id}`, { cookie }).send({ capacity: 1 });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("CAPACITY_TOO_LOW");
    const stored = await prisma.trainingSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(stored.capacity).toBe(20);
    const accepted = await call("patch", `${BASE}/${session.id}`, { cookie }).send({ capacity: 2 });
    expect(accepted.status).toBe(200);
    expect(accepted.body.session.capacity).toBe(2);
  });

  it("controle la coherence des dates avec les valeurs existantes", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id, { startsInHours: 24 });
    const res = await call("patch", `${BASE}/${session.id}`, { cookie }).send({ endsAt: inHours(10) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_DATES");
  });

  it("refuse de changer la formation ou un champ inconnu", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const other = await createCourse({ name: "Autre" });
    const session = await createSessionWith(course.id);
    for (const body of [{ courseId: other.id }, { room: "X" }]) {
      const res = await call("patch", `${BASE}/${session.id}`, { cookie }).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("n'empeche pas de modifier une session dont le formateur a ete desactive", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id, { trainerId: trainer.id });
    await prisma.user.update({ where: { id: trainer.id }, data: { status: "DISABLED" } });
    const res = await call("patch", `${BASE}/${session.id}`, { cookie }).send({ location: "Salle E5" });
    expect(res.status).toBe(200);
    expect(res.body.session.location).toBe("Salle E5");
    expect(res.body.session.trainer.id).toBe(trainer.id);
  });

  it("refuse l'affectation d'un formateur invalide", async () => {
    const { cookie } = await adminSession();
    const learner = await createUser({ role: "LEARNER", email: "learner@test.example" });
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id);
    const res = await call("patch", `${BASE}/${session.id}`, { cookie }).send({ trainerId: learner.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_TRAINER");
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la modification a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const course = await createCourse({ name: "Formation", trainerId: role === "TRAINER" ? user.id : null });
    const session = await createSessionWith(course.id, { trainerId: role === "TRAINER" ? user.id : null });
    const cookie = await loginCookie("web", user.email);
    const res = await call("patch", `${BASE}/${session.id}`, { cookie, client: "web" }).send({ location: "Piratee" });
    expect(res.status).toBe(403);
    const stored = await prisma.trainingSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(stored.location).toBe("Salle B2");
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("patch", `${BASE}/identifiant-inexistant`, { cookie }).send({ location: "Fantome" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("refuse un corps vide", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id);
    const res = await call("patch", `${BASE}/${session.id}`, { cookie }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/training-sessions/:id", () => {
  it("supprime une session sans presence", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id);
    const res = await call("delete", `${BASE}/${session.id}`, { cookie });
    expect(res.status).toBe(204);
    expect(await prisma.trainingSession.count({ where: { id: session.id } })).toBe(0);
  });

  it("refuse de supprimer une session qui a des presences (409)", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(0);
    const course = await createCourse({ name: "Formation" });
    const session = await createSessionWith(course.id);
    await markPresent(session.id, learner.id);
    const res = await call("delete", `${BASE}/${session.id}`, { cookie });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_IN_USE");
    expect(await prisma.trainingSession.count({ where: { id: session.id } })).toBe(1);
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la suppression a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const course = await createCourse({ name: "Formation", trainerId: role === "TRAINER" ? user.id : null });
    const session = await createSessionWith(course.id, { trainerId: role === "TRAINER" ? user.id : null });
    const cookie = await loginCookie("web", user.email);
    const res = await call("delete", `${BASE}/${session.id}`, { cookie, client: "web" });
    expect(res.status).toBe(403);
    expect(await prisma.trainingSession.count({ where: { id: session.id } })).toBe(1);
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("delete", `${BASE}/identifiant-inexistant`, { cookie });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
  });
});