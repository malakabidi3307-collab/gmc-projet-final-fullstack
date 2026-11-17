import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { createCourse, enroll } from "./course-helpers.js";
import { createLearner, createSessionWith } from "./enrollment-helpers.js";
import { ADMIN_ORIGIN, WEB_ORIGIN, createUser, resetDatabase } from "./helpers.js";
import { app, loginCookie } from "./session-helpers.js";

type Method = "get" | "post" | "patch" | "delete";
type Client = "admin" | "web";

const BASE = "/api/enrollments";

function call(method: Method, path: string, options: { cookie?: string; client?: Client } = {}) {
  const origin = options.client === "web" ? WEB_ORIGIN : ADMIN_ORIGIN;
  const req = request(app)[method](path).set("Origin", origin);
  return options.cookie ? req.set("Cookie", options.cookie) : req;
}

const ids = (res: { body: { data: { id: string }[] } }) => res.body.data.map((item) => item.id);
const sorted = (list: string[]) => [...list].sort();

async function adminSession() {
  const admin = await createUser({ role: "ADMIN", email: "zadmin@test.example" });
  return { admin, cookie: await loginCookie("admin", admin.email) };
}

async function trainerSession(email = "trainer@test.example", name = "Sara Benali") {
  const trainer = await createUser({ role: "TRAINER", email, name });
  return { trainer, cookie: await loginCookie("web", trainer.email) };
}

async function learnerCookie(email: string) {
  return loginCookie("web", email);
}

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe("acces et visibilite des inscriptions", () => {
  it("refuse une requete sans session", async () => {
    const res = await call("get", BASE);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("l'administrateur voit toutes les inscriptions, formations brouillon comprises", async () => {
    const { cookie } = await adminSession();
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    const published = await createCourse({ name: "A" });
    const draft = await createCourse({ name: "B", status: "DRAFT" });
    const e1 = await enroll(l1.id, published.id);
    const e2 = await enroll(l2.id, draft.id);
    const res = await call("get", BASE, { cookie });
    expect(res.status).toBe(200);
    expect(sorted(ids(res))).toEqual(sorted([e1.id, e2.id]));
  });

  it("l'apprenant ne voit que ses propres inscriptions, annulees comprises", async () => {
    const me = await createLearner(1);
    const other = await createLearner(2);
    const cookie = await learnerCookie(me.email);
    const c1 = await createCourse({ name: "A" });
    const c2 = await createCourse({ name: "B" });
    const e1 = await enroll(me.id, c1.id, "CONFIRMED");
    const e2 = await enroll(me.id, c2.id, "CANCELLED");
    await enroll(other.id, c1.id, "CONFIRMED");
    const res = await call("get", BASE, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(sorted(ids(res))).toEqual(sorted([e1.id, e2.id]));
  });

  it("le formateur voit les inscriptions des formations de son perimetre, hors brouillons", async () => {
    const { trainer, cookie } = await trainerSession();
    const other = await createUser({ role: "TRAINER", email: "other@test.example" });
    const learner = await createLearner(1);
    const own = await createCourse({ name: "A", trainerId: trainer.id });
    const animated = await createCourse({ name: "B", trainerId: other.id });
    const foreign = await createCourse({ name: "C", trainerId: other.id });
    const draft = await createCourse({ name: "D", trainerId: trainer.id, status: "DRAFT" });
    await createSessionWith(animated.id, { trainerId: trainer.id });
    const e1 = await enroll(learner.id, own.id);
    const e2 = await enroll(learner.id, animated.id);
    await enroll(learner.id, foreign.id);
    await enroll(learner.id, draft.id);
    const res = await call("get", BASE, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(sorted(ids(res))).toEqual(sorted([e1.id, e2.id]));
  });

  it("expose l'apprenant et la formation sous la forme { id, name } uniquement", async () => {
    const learner = await createLearner(1);
    const cookie = await learnerCookie(learner.email);
    const course = await createCourse({ name: "Compta" });
    const e = await enroll(learner.id, course.id, "CONFIRMED");
    const res = await call("get", `${BASE}/${e.id}`, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(res.body.enrollment).toMatchObject({ id: e.id, status: "CONFIRMED", progress: 0 });
    expect(res.body.enrollment.student).toEqual({ id: learner.id, name: learner.name });
    expect(res.body.enrollment.course).toEqual({ id: course.id, name: "Compta" });
  });

  it("l'apprenant ne peut pas lire l'inscription d'un autre (404)", async () => {
    const me = await createLearner(1);
    const other = await createLearner(2);
    const cookie = await learnerCookie(me.email);
    const course = await createCourse({ name: "Compta" });
    const e = await enroll(other.id, course.id);
    const res = await call("get", `${BASE}/${e.id}`, { cookie, client: "web" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ENROLLMENT_NOT_FOUND");
  });

  it("le formateur lit les inscriptions de son perimetre, pas les autres (404)", async () => {
    const { trainer, cookie } = await trainerSession();
    const other = await createUser({ role: "TRAINER", email: "other@test.example" });
    const learner = await createLearner(1);
    const own = await createCourse({ name: "A", trainerId: trainer.id });
    const foreign = await createCourse({ name: "B", trainerId: other.id });
    const e1 = await enroll(learner.id, own.id);
    const e2 = await enroll(learner.id, foreign.id);
    const ok = await call("get", `${BASE}/${e1.id}`, { cookie, client: "web" });
    expect(ok.status).toBe(200);
    const hidden = await call("get", `${BASE}/${e2.id}`, { cookie, client: "web" });
    expect(hidden.status).toBe(404);
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("get", `${BASE}/identifiant-inexistant`, { cookie });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ENROLLMENT_NOT_FOUND");
  });

  it("filtre par statut et par formation", async () => {
    const { cookie } = await adminSession();
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    const c1 = await createCourse({ name: "A" });
    const c2 = await createCourse({ name: "B" });
    const e1 = await enroll(l1.id, c1.id, "CONFIRMED");
    const e2 = await enroll(l2.id, c1.id, "PENDING");
    const e3 = await enroll(l1.id, c2.id, "CONFIRMED");
    const byStatus = await call("get", `${BASE}?status=PENDING`, { cookie });
    expect(ids(byStatus)).toEqual([e2.id]);
    const byCourse = await call("get", `${BASE}?courseId=${c2.id}`, { cookie });
    expect(ids(byCourse)).toEqual([e3.id]);
    const both = await call("get", `${BASE}?courseId=${c1.id}&status=CONFIRMED`, { cookie });
    expect(ids(both)).toEqual([e1.id]);
  });

  it("refuse des parametres invalides", async () => {
    const { cookie } = await adminSession();
    for (const query of ["pageSize=500", "status=ONGOING", "sort=studentId", "page=0"]) {
      const res = await call("get", `${BASE}?${query}`, { cookie });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("POST /api/enrollments", () => {
  it("inscrit un apprenant en attente par defaut et persiste l'inscription", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    const res = await call("post", BASE, { cookie }).send({ studentId: learner.id, courseId: course.id });
    expect(res.status).toBe(201);
    expect(res.body.enrollment).toMatchObject({ status: "PENDING", progress: 0 });
    expect(res.body.enrollment.student).toEqual({ id: learner.id, name: learner.name });
    expect(res.body.enrollment.course).toEqual({ id: course.id, name: "Compta" });
    expect(await prisma.enrollment.count({ where: { studentId: learner.id, courseId: course.id } })).toBe(1);
  });

  it("accepte un statut CONFIRMED a la creation", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    const res = await call("post", BASE, { cookie }).send({
      studentId: learner.id,
      courseId: course.id,
      status: "CONFIRMED",
    });
    expect(res.status).toBe(201);
    expect(res.body.enrollment.status).toBe("CONFIRMED");
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la creation a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const cookie = await loginCookie("web", user.email);
    const course = await createCourse({ name: "Compta" });
    const res = await call("post", BASE, { cookie, client: "web" }).send({ studentId: user.id, courseId: course.id });
    expect(res.status).toBe(403);
    expect(await prisma.enrollment.count()).toBe(0);
  });

  it("refuse des donnees invalides ou inconnues", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    const base = { studentId: learner.id, courseId: course.id };
    const invalidBodies = [
      { courseId: course.id },
      { studentId: learner.id },
      { ...base, status: "CANCELLED" },
      { ...base, status: "ONGOING" },
      { ...base, progress: 100 },
    ];
    for (const body of invalidBodies) {
      const res = await call("post", BASE, { cookie }).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
    expect(await prisma.enrollment.count()).toBe(0);
  });

  it("refuse un apprenant invalide (formateur, desactive ou inconnu)", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Compta" });
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const disabled = await createUser({ role: "LEARNER", email: "disabled@test.example", status: "DISABLED" });
    for (const studentId of [trainer.id, disabled.id, "identifiant-inexistant"]) {
      const res = await call("post", BASE, { cookie }).send({ studentId, courseId: course.id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STUDENT");
    }
    expect(await prisma.enrollment.count()).toBe(0);
  });

  it("renvoie 404 si la formation n'existe pas", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const res = await call("post", BASE, { cookie }).send({ studentId: learner.id, courseId: "identifiant-inexistant" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("COURSE_NOT_FOUND");
  });

  it.each(["DRAFT", "ARCHIVED"] as const)("refuse l'inscription a une formation %s (409)", async (status) => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Fermee", status });
    const res = await call("post", BASE, { cookie }).send({ studentId: learner.id, courseId: course.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("COURSE_NOT_OPEN");
    expect(await prisma.enrollment.count()).toBe(0);
  });

  it.each(["PENDING", "CONFIRMED"] as const)("refuse un doublon actif %s (409)", async (status) => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    await enroll(learner.id, course.id, status);
    const res = await call("post", BASE, { cookie }).send({ studentId: learner.id, courseId: course.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_ENROLLED");
    expect(await prisma.enrollment.count()).toBe(1);
  });

  it("reactive l'inscription annulee existante au lieu d'en creer une seconde", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    const existing = await enroll(learner.id, course.id, "CANCELLED");
    await prisma.enrollment.update({ where: { id: existing.id }, data: { progress: 40 } });
    const res = await call("post", BASE, { cookie }).send({ studentId: learner.id, courseId: course.id });
    expect(res.status).toBe(201);
    expect(res.body.enrollment).toMatchObject({ id: existing.id, status: "PENDING", progress: 40 });
    expect(await prisma.enrollment.count()).toBe(1);
  });

  it("n'impose aucune limite a une formation sans session", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Libre" });
    for (const n of [1, 2, 3]) {
      const learner = await createLearner(n);
      const res = await call("post", BASE, { cookie }).send({ studentId: learner.id, courseId: course.id });
      expect(res.status).toBe(201);
    }
  });

  it("refuse en SESSION_FULL quand les inscriptions actives atteignent la plus petite capacite", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Limitee" });
    await createSessionWith(course.id, { capacity: 5 });
    await createSessionWith(course.id, { capacity: 2, startsInHours: 48 });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    await enroll(l0.id, course.id, "CONFIRMED");
    await enroll(l1.id, course.id, "PENDING");
    const res = await call("post", BASE, { cookie }).send({ studentId: l2.id, courseId: course.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_FULL");
    expect(await prisma.enrollment.count({ where: { courseId: course.id } })).toBe(2);
  });

  it("ne compte pas les inscriptions annulees dans la capacite", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Limitee" });
    await createSessionWith(course.id, { capacity: 2 });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    await enroll(l0.id, course.id, "CONFIRMED");
    await enroll(l1.id, course.id, "CANCELLED");
    const res = await call("post", BASE, { cookie }).send({ studentId: l2.id, courseId: course.id });
    expect(res.status).toBe(201);
  });

  it("recalcule la capacite minimale quand la plus petite session est supprimee", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Limitee" });
    await createSessionWith(course.id, { capacity: 5 });
    const small = await createSessionWith(course.id, { capacity: 2, startsInHours: 48 });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    await enroll(l0.id, course.id, "CONFIRMED");
    await enroll(l1.id, course.id, "CONFIRMED");
    const full = await call("post", BASE, { cookie }).send({ studentId: l2.id, courseId: course.id });
    expect(full.status).toBe(409);
    const removed = await call("delete", `/api/training-sessions/${small.id}`, { cookie });
    expect(removed.status).toBe(204);
    const open = await call("post", BASE, { cookie }).send({ studentId: l2.id, courseId: course.id });
    expect(open.status).toBe(201);
  });

  it("recalcule la capacite minimale quand une session plus petite est ajoutee", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Limitee" });
    await createSessionWith(course.id, { capacity: 5 });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    const l3 = await createLearner(3);
    await enroll(l0.id, course.id, "CONFIRMED");
    await enroll(l1.id, course.id, "CONFIRMED");
    await createSessionWith(course.id, { capacity: 3, startsInHours: 48 });
    const third = await call("post", BASE, { cookie }).send({ studentId: l2.id, courseId: course.id });
    expect(third.status).toBe(201);
    const fourth = await call("post", BASE, { cookie }).send({ studentId: l3.id, courseId: course.id });
    expect(fourth.status).toBe(409);
    expect(fourth.body.error.code).toBe("SESSION_FULL");
  });

  it("applique aussi la capacite a la reactivation d'une inscription annulee", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Limitee" });
    await createSessionWith(course.id, { capacity: 1 });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    await enroll(l0.id, course.id, "CONFIRMED");
    const cancelled = await enroll(l1.id, course.id, "CANCELLED");
    const res = await call("post", BASE, { cookie }).send({ studentId: l1.id, courseId: course.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_FULL");
    const stored = await prisma.enrollment.findUniqueOrThrow({ where: { id: cancelled.id } });
    expect(stored.status).toBe("CANCELLED");
  });
});

describe("PATCH /api/enrollments/:id", () => {
  it("met a jour le statut et la progression", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    const e = await enroll(learner.id, course.id, "PENDING");
    const res = await call("patch", `${BASE}/${e.id}`, { cookie }).send({ status: "CONFIRMED", progress: 60 });
    expect(res.status).toBe(200);
    expect(res.body.enrollment).toMatchObject({ id: e.id, status: "CONFIRMED", progress: 60 });
  });

  it("refuse des donnees invalides, inconnues ou un corps vide", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    const e = await enroll(learner.id, course.id);
    const invalidBodies = [
      {},
      { progress: 101 },
      { progress: -1 },
      { progress: 1.5 },
      { status: "ONGOING" },
      { studentId: "x" },
      { courseId: "x" },
    ];
    for (const body of invalidBodies) {
      const res = await call("patch", `${BASE}/${e.id}`, { cookie }).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("applique la capacite quand une inscription annulee est reactivee", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Limitee" });
    await createSessionWith(course.id, { capacity: 1 });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    await enroll(l0.id, course.id, "CONFIRMED");
    const cancelled = await enroll(l1.id, course.id, "CANCELLED");
    const res = await call("patch", `${BASE}/${cancelled.id}`, { cookie }).send({ status: "CONFIRMED" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_FULL");
    const stored = await prisma.enrollment.findUniqueOrThrow({ where: { id: cancelled.id } });
    expect(stored.status).toBe("CANCELLED");
  });

  it("refuse de reactiver une inscription sur une formation archivee", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Archivee", status: "ARCHIVED" });
    const cancelled = await enroll(learner.id, course.id, "CANCELLED");
    const res = await call("patch", `${BASE}/${cancelled.id}`, { cookie }).send({ status: "PENDING" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("COURSE_NOT_OPEN");
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la modification a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const owner = await createLearner(1);
    const course = await createCourse({ name: "Compta", trainerId: role === "TRAINER" ? user.id : null });
    const e = await enroll(role === "LEARNER" ? user.id : owner.id, course.id, "PENDING");
    const cookie = await loginCookie("web", user.email);
    const res = await call("patch", `${BASE}/${e.id}`, { cookie, client: "web" }).send({ status: "CONFIRMED" });
    expect(res.status).toBe(403);
    const stored = await prisma.enrollment.findUniqueOrThrow({ where: { id: e.id } });
    expect(stored.status).toBe("PENDING");
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("patch", `${BASE}/identifiant-inexistant`, { cookie }).send({ progress: 10 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ENROLLMENT_NOT_FOUND");
  });
});

describe("POST /api/enrollments/:id/cancel", () => {
  it("l'apprenant annule sa propre inscription, qui est conservee", async () => {
    const learner = await createLearner(1);
    const cookie = await learnerCookie(learner.email);
    const course = await createCourse({ name: "Compta" });
    const e = await enroll(learner.id, course.id, "CONFIRMED");
    const res = await call("post", `${BASE}/${e.id}/cancel`, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(res.body.enrollment.status).toBe("CANCELLED");
    expect(await prisma.enrollment.count({ where: { id: e.id } })).toBe(1);
  });

  it("l'apprenant ne peut pas annuler l'inscription d'un autre (404)", async () => {
    const me = await createLearner(1);
    const other = await createLearner(2);
    const cookie = await learnerCookie(me.email);
    const course = await createCourse({ name: "Compta" });
    const e = await enroll(other.id, course.id, "CONFIRMED");
    const res = await call("post", `${BASE}/${e.id}/cancel`, { cookie, client: "web" });
    expect(res.status).toBe(404);
    const stored = await prisma.enrollment.findUniqueOrThrow({ where: { id: e.id } });
    expect(stored.status).toBe("CONFIRMED");
  });

  it("l'administrateur peut annuler n'importe quelle inscription", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    const e = await enroll(learner.id, course.id, "PENDING");
    const res = await call("post", `${BASE}/${e.id}/cancel`, { cookie });
    expect(res.status).toBe(200);
    expect(res.body.enrollment.status).toBe("CANCELLED");
  });

  it("refuse l'annulation a un formateur (403)", async () => {
    const { trainer, cookie } = await trainerSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta", trainerId: trainer.id });
    const e = await enroll(learner.id, course.id, "CONFIRMED");
    const res = await call("post", `${BASE}/${e.id}/cancel`, { cookie, client: "web" });
    expect(res.status).toBe(403);
    const stored = await prisma.enrollment.findUniqueOrThrow({ where: { id: e.id } });
    expect(stored.status).toBe("CONFIRMED");
  });

  it("est idempotente sur une inscription deja annulee", async () => {
    const { cookie } = await adminSession();
    const learner = await createLearner(1);
    const course = await createCourse({ name: "Compta" });
    const e = await enroll(learner.id, course.id, "CANCELLED");
    const res = await call("post", `${BASE}/${e.id}/cancel`, { cookie });
    expect(res.status).toBe(200);
    expect(res.body.enrollment.status).toBe("CANCELLED");
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("post", `${BASE}/identifiant-inexistant/cancel`, { cookie });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ENROLLMENT_NOT_FOUND");
  });

  it("libere une place pour un autre apprenant", async () => {
    const { cookie: adminCookie } = await adminSession();
    const course = await createCourse({ name: "Limitee" });
    await createSessionWith(course.id, { capacity: 1 });
    const l0 = await createLearner(0);
    const l1 = await createLearner(1);
    const e = await enroll(l0.id, course.id, "CONFIRMED");
    const full = await call("post", BASE, { cookie: adminCookie }).send({ studentId: l1.id, courseId: course.id });
    expect(full.status).toBe(409);
    const cookie = await learnerCookie(l0.email);
    const cancel = await call("post", `${BASE}/${e.id}/cancel`, { cookie, client: "web" });
    expect(cancel.status).toBe(200);
    const open = await call("post", BASE, { cookie: adminCookie }).send({ studentId: l1.id, courseId: course.id });
    expect(open.status).toBe(201);
  });
});