import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { createCourse, createTrainingSession, enroll } from "./course-helpers.js";
import { ADMIN_ORIGIN, WEB_ORIGIN, createUser, resetDatabase } from "./helpers.js";
import { app, loginCookie } from "./session-helpers.js";

type Method = "get" | "post" | "patch" | "delete";
type Client = "admin" | "web";

function call(method: Method, path: string, options: { cookie?: string; client?: Client } = {}) {
  const origin = options.client === "web" ? WEB_ORIGIN : ADMIN_ORIGIN;
  const req = request(app)[method](path).set("Origin", origin);
  return options.cookie ? req.set("Cookie", options.cookie) : req;
}

const names = (res: { body: { data: { name: string }[] } }) => res.body.data.map((c) => c.name);

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

describe("acces et visibilite", () => {
  it("refuse une requete sans session", async () => {
    const res = await call("get", "/api/courses");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("l'administrateur voit toutes les formations, brouillons compris", async () => {
    const { cookie } = await adminSession();
    await createCourse({ name: "Publiee", status: "PUBLISHED" });
    await createCourse({ name: "Brouillon", status: "DRAFT" });
    await createCourse({ name: "Archivee", status: "ARCHIVED" });
    const res = await call("get", "/api/courses?sort=name&order=asc", { cookie });
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(["Archivee", "Brouillon", "Publiee"]);
  });

  it("le formateur ne voit que ses formations (responsable ou session), hors brouillons", async () => {
    const { trainer, cookie } = await trainerSession();
    const other = await createUser({ role: "TRAINER", email: "other@test.example" });
    await createCourse({ name: "A responsable", trainerId: trainer.id });
    const viaSession = await createCourse({ name: "B via session", trainerId: other.id });
    await createTrainingSession(viaSession.id, trainer.id);
    await createCourse({ name: "C autre formateur", trainerId: other.id });
    await createCourse({ name: "D brouillon", trainerId: trainer.id, status: "DRAFT" });
    await createCourse({ name: "E archivee", trainerId: trainer.id, status: "ARCHIVED" });
    const res = await call("get", "/api/courses?sort=name&order=asc", { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(["A responsable", "B via session", "E archivee"]);
  });

  it("l'apprenant ne voit que les formations ou il est inscrit (hors annulees et brouillons)", async () => {
    const { learner, cookie } = await learnerSession();
    const other = await createUser({ role: "LEARNER", email: "other@test.example" });
    const confirmed = await createCourse({ name: "A confirmee" });
    const pending = await createCourse({ name: "B en attente" });
    const cancelled = await createCourse({ name: "C annulee" });
    await createCourse({ name: "D non inscrit" });
    const draft = await createCourse({ name: "E brouillon", status: "DRAFT" });
    const others = await createCourse({ name: "F autre apprenant" });
    await enroll(learner.id, confirmed.id, "CONFIRMED");
    await enroll(learner.id, pending.id, "PENDING");
    await enroll(learner.id, cancelled.id, "CANCELLED");
    await enroll(learner.id, draft.id, "CONFIRMED");
    await enroll(other.id, others.id, "CONFIRMED");
    const res = await call("get", "/api/courses?sort=name&order=asc", { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(["A confirmee", "B en attente"]);
  });

  it("indique le nombre d'inscrits confirmes a l'administrateur et au formateur", async () => {
    const { cookie: adminCookie } = await adminSession();
    const { trainer, cookie: trainerCookie } = await trainerSession();
    const course = await createCourse({ name: "Compta", trainerId: trainer.id });
    const l1 = await createUser({ role: "LEARNER", email: "l1@test.example" });
    const l2 = await createUser({ role: "LEARNER", email: "l2@test.example" });
    const l3 = await createUser({ role: "LEARNER", email: "l3@test.example" });
    await enroll(l1.id, course.id, "CONFIRMED");
    await enroll(l2.id, course.id, "CONFIRMED");
    await enroll(l3.id, course.id, "PENDING");
    const asAdmin = await call("get", `/api/courses/${course.id}`, { cookie: adminCookie });
    expect(asAdmin.body.course.enrolled).toBe(2);
    const asTrainer = await call("get", `/api/courses/${course.id}`, { cookie: trainerCookie, client: "web" });
    expect(asTrainer.body.course.enrolled).toBe(2);
  });

  it("masque le nombre d'inscrits a un apprenant", async () => {
    const { learner, cookie } = await learnerSession();
    const course = await createCourse({ name: "Compta" });
    await enroll(learner.id, course.id);
    const res = await call("get", `/api/courses/${course.id}`, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(res.body.course).not.toHaveProperty("enrolled");
  });
});

describe("GET /api/courses/:id", () => {
  it("l'administrateur voit un brouillon", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Brouillon", status: "DRAFT" });
    const res = await call("get", `/api/courses/${course.id}`, { cookie });
    expect(res.status).toBe(200);
    expect(res.body.course.status).toBe("DRAFT");
  });

  it("le formateur voit sa formation, avec le formateur limite a id et nom", async () => {
    const { trainer, cookie } = await trainerSession();
    const course = await createCourse({ name: "Ma formation", trainerId: trainer.id });
    const res = await call("get", `/api/courses/${course.id}`, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(res.body.course.trainer).toEqual({ id: trainer.id, name: trainer.name });
  });

  it("le formateur ne peut pas lire la formation d'un autre (404)", async () => {
    const { cookie } = await trainerSession();
    const other = await createUser({ role: "TRAINER", email: "other@test.example" });
    const course = await createCourse({ name: "Pas la mienne", trainerId: other.id });
    const res = await call("get", `/api/courses/${course.id}`, { cookie, client: "web" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("COURSE_NOT_FOUND");
  });

  it("le formateur ne voit pas un brouillon, meme assigne (404)", async () => {
    const { trainer, cookie } = await trainerSession();
    const course = await createCourse({ name: "Brouillon", trainerId: trainer.id, status: "DRAFT" });
    const res = await call("get", `/api/courses/${course.id}`, { cookie, client: "web" });
    expect(res.status).toBe(404);
  });

  it("l'apprenant inscrit voit la formation", async () => {
    const { learner, cookie } = await learnerSession();
    const course = await createCourse({ name: "Ma formation" });
    await enroll(learner.id, course.id);
    const res = await call("get", `/api/courses/${course.id}`, { cookie, client: "web" });
    expect(res.status).toBe(200);
    expect(res.body.course.name).toBe("Ma formation");
  });

  it("l'apprenant non inscrit ne la voit pas (404)", async () => {
    const { cookie } = await learnerSession();
    const course = await createCourse({ name: "Pas la mienne" });
    const res = await call("get", `/api/courses/${course.id}`, { cookie, client: "web" });
    expect(res.status).toBe(404);
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("get", "/api/courses/identifiant-inexistant", { cookie });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("COURSE_NOT_FOUND");
  });
});

describe("filtres, tri et pagination", () => {
  it("filtre par statut", async () => {
    const { cookie } = await adminSession();
    await createCourse({ name: "P1", status: "PUBLISHED" });
    await createCourse({ name: "P2", status: "PUBLISHED" });
    await createCourse({ name: "A1", status: "ARCHIVED" });
    const res = await call("get", "/api/courses?status=ARCHIVED", { cookie });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(names(res)).toEqual(["A1"]);
  });

  it("recherche par nom et filtre par categorie sans tenir compte de la casse", async () => {
    const { cookie } = await adminSession();
    await createCourse({ name: "Gestion de projet", category: "Management" });
    await createCourse({ name: "Comptabilite appliquee", category: "Finance" });
    const byQuery = await call("get", "/api/courses?q=PROJET", { cookie });
    expect(names(byQuery)).toEqual(["Gestion de projet"]);
    const byCategory = await call("get", "/api/courses?category=finance", { cookie });
    expect(names(byCategory)).toEqual(["Comptabilite appliquee"]);
  });

  it("filtre par formateur responsable", async () => {
    const { cookie } = await adminSession();
    const t1 = await createUser({ role: "TRAINER", email: "t1@test.example" });
    const t2 = await createUser({ role: "TRAINER", email: "t2@test.example" });
    await createCourse({ name: "De T1", trainerId: t1.id });
    await createCourse({ name: "De T2", trainerId: t2.id });
    const res = await call("get", `/api/courses?trainerId=${t1.id}`, { cookie });
    expect(names(res)).toEqual(["De T1"]);
  });

  it("pagine et trie", async () => {
    const { cookie } = await adminSession();
    for (const name of ["C1", "C2", "C3", "C4", "C5"]) {
      await createCourse({ name });
    }
    const res = await call("get", "/api/courses?page=3&pageSize=2&sort=name&order=asc", { cookie });
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(["C5"]);
    expect(res.body.meta).toEqual({ page: 3, pageSize: 2, total: 5, totalPages: 3 });
  });

  it("refuse des parametres invalides", async () => {
    const { cookie } = await adminSession();
    for (const query of ["pageSize=500", "status=ONGOING", "sort=trainerId", "page=0"]) {
      const res = await call("get", `/api/courses?${query}`, { cookie });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("POST /api/courses", () => {
  it("cree une formation avec son formateur et la persiste", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example", name: "Sara Benali" });
    const res = await call("post", "/api/courses", { cookie }).send({
      name: "  Gestion de projet ",
      category: "Management",
      durationHours: 30,
      status: "PUBLISHED",
      description: "Introduction a la gestion de projet.",
      trainerId: trainer.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.course).toMatchObject({
      name: "Gestion de projet",
      category: "Management",
      durationHours: 30,
      status: "PUBLISHED",
      trainer: { id: trainer.id, name: "Sara Benali" },
    });
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: res.body.course.id } });
    expect(stored.trainerId).toBe(trainer.id);
  });

  it("cree la formation en brouillon par defaut", async () => {
    const { cookie } = await adminSession();
    const res = await call("post", "/api/courses", { cookie }).send({
      name: "Sans statut",
      category: "Gestion",
      durationHours: 10,
    });
    expect(res.status).toBe(201);
    expect(res.body.course.status).toBe("DRAFT");
    expect(res.body.course.trainer).toBeNull();
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la creation a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const cookie = await loginCookie("web", user.email);
    const res = await call("post", "/api/courses", { cookie, client: "web" }).send({
      name: "Formation",
      category: "Gestion",
      durationHours: 10,
    });
    expect(res.status).toBe(403);
    expect(await prisma.course.count()).toBe(0);
  });

  it("refuse des donnees invalides", async () => {
    const { cookie } = await adminSession();
    const invalidBodies = [
      { name: "A", category: "Gestion", durationHours: 10 },
      { name: "Formation", category: "G", durationHours: 10 },
      { name: "Formation", category: "Gestion", durationHours: 0 },
      { name: "Formation", category: "Gestion", durationHours: 12.5 },
      { name: "Formation", category: "Gestion", durationHours: 10, status: "ONGOING" },
    ];
    for (const body of invalidBodies) {
      const res = await call("post", "/api/courses", { cookie }).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
    expect(await prisma.course.count()).toBe(0);
  });

  it("refuse les champs inconnus", async () => {
    const { cookie } = await adminSession();
    const res = await call("post", "/api/courses", { cookie }).send({
      name: "Formation",
      category: "Gestion",
      durationHours: 10,
      enrolled: 500,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("refuse un formateur invalide (apprenant, desactive ou inconnu)", async () => {
    const { cookie } = await adminSession();
    const learner = await createUser({ role: "LEARNER", email: "learner@test.example" });
    const disabled = await createUser({ role: "TRAINER", email: "disabled@test.example", status: "DISABLED" });
    for (const trainerId of [learner.id, disabled.id, "identifiant-inexistant"]) {
      const res = await call("post", "/api/courses", { cookie }).send({
        name: "Formation",
        category: "Gestion",
        durationHours: 10,
        trainerId,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TRAINER");
    }
    expect(await prisma.course.count()).toBe(0);
  });
});

describe("PATCH /api/courses/:id", () => {
  it("met a jour les champs et affecte un formateur", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example", name: "Sara Benali" });
    const course = await createCourse({ name: "Ancienne", status: "DRAFT" });
    const res = await call("patch", `/api/courses/${course.id}`, { cookie }).send({
      name: "Nouvelle",
      category: "Finance",
      durationHours: 40,
      status: "PUBLISHED",
      description: "Nouveau texte",
      trainerId: trainer.id,
    });
    expect(res.status).toBe(200);
    expect(res.body.course).toMatchObject({
      name: "Nouvelle",
      category: "Finance",
      durationHours: 40,
      status: "PUBLISHED",
      description: "Nouveau texte",
      trainer: { id: trainer.id, name: "Sara Benali" },
    });
  });

  it("retire le formateur avec trainerId null", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const course = await createCourse({ name: "Avec formateur", trainerId: trainer.id });
    const res = await call("patch", `/api/courses/${course.id}`, { cookie }).send({ trainerId: null });
    expect(res.status).toBe(200);
    expect(res.body.course.trainer).toBeNull();
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.trainerId).toBeNull();
  });

  it("refuse l'affectation d'un formateur invalide", async () => {
    const { cookie } = await adminSession();
    const learner = await createUser({ role: "LEARNER", email: "learner@test.example" });
    const course = await createCourse({ name: "Formation" });
    const res = await call("patch", `/api/courses/${course.id}`, { cookie }).send({ trainerId: learner.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_TRAINER");
  });

  it("n'empeche pas de modifier une formation dont le formateur a ete desactive", async () => {
    const { cookie } = await adminSession();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const course = await createCourse({ name: "Ancien nom", trainerId: trainer.id });
    await prisma.user.update({ where: { id: trainer.id }, data: { status: "DISABLED" } });
    const res = await call("patch", `/api/courses/${course.id}`, { cookie }).send({ name: "Nouveau nom" });
    expect(res.status).toBe(200);
    expect(res.body.course.name).toBe("Nouveau nom");
    expect(res.body.course.trainer.id).toBe(trainer.id);
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la modification a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const course = await createCourse({ name: "Originale", trainerId: role === "TRAINER" ? user.id : null });
    const cookie = await loginCookie("web", user.email);
    const res = await call("patch", `/api/courses/${course.id}`, { cookie, client: "web" }).send({ name: "Piratee" });
    expect(res.status).toBe(403);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.name).toBe("Originale");
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("patch", "/api/courses/identifiant-inexistant", { cookie }).send({ name: "Fantome" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("COURSE_NOT_FOUND");
  });

  it("refuse un corps vide", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Formation" });
    const res = await call("patch", `/api/courses/${course.id}`, { cookie }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/courses/:id", () => {
  it("supprime une formation inutilisee", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "A supprimer" });
    const res = await call("delete", `/api/courses/${course.id}`, { cookie });
    expect(res.status).toBe(204);
    expect(await prisma.course.count({ where: { id: course.id } })).toBe(0);
  });

  it("refuse de supprimer une formation qui a une inscription (409)", async () => {
    const { cookie } = await adminSession();
    const learner = await createUser({ role: "LEARNER", email: "learner@test.example" });
    const course = await createCourse({ name: "Avec inscrit" });
    await enroll(learner.id, course.id);
    const res = await call("delete", `/api/courses/${course.id}`, { cookie });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("COURSE_IN_USE");
    expect(await prisma.course.count({ where: { id: course.id } })).toBe(1);
  });

  it("refuse de supprimer une formation qui a une session (409)", async () => {
    const { cookie } = await adminSession();
    const course = await createCourse({ name: "Avec session" });
    await createTrainingSession(course.id);
    const res = await call("delete", `/api/courses/${course.id}`, { cookie });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("COURSE_IN_USE");
    expect(await prisma.course.count({ where: { id: course.id } })).toBe(1);
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse la suppression a un %s (403)", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const course = await createCourse({ name: "Protegee", trainerId: role === "TRAINER" ? user.id : null });
    const cookie = await loginCookie("web", user.email);
    const res = await call("delete", `/api/courses/${course.id}`, { cookie, client: "web" });
    expect(res.status).toBe(403);
    expect(await prisma.course.count({ where: { id: course.id } })).toBe(1);
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const { cookie } = await adminSession();
    const res = await call("delete", "/api/courses/identifiant-inexistant", { cookie });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("COURSE_NOT_FOUND");
  });
});