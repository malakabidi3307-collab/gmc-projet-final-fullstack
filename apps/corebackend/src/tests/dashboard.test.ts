import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { createCourse, enroll } from "./course-helpers.js";
import { createLearner, createSessionWith } from "./enrollment-helpers.js";
import { ADMIN_ORIGIN, WEB_ORIGIN, createUser, resetDatabase } from "./helpers.js";
import { app, loginCookie } from "./session-helpers.js";

const PATH = "/api/admin/dashboard";

function get(cookie?: string, origin: string = ADMIN_ORIGIN) {
  const req = request(app).get(PATH).set("Origin", origin);
  return cookie ? req.set("Cookie", cookie) : req;
}

async function adminCookie() {
  const admin = await createUser({ role: "ADMIN", email: "zadmin@test.example" });
  return loginCookie("admin", admin.email);
}

const monthKey = (offset: number) => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - offset, 1)).toISOString().slice(0, 7);
};
const inMonth = (offset: number) => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - offset, 15));
};

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe("GET /api/admin/dashboard", () => {
  it("refuse une requete sans session", async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it.each(["TRAINER", "LEARNER"] as const)("refuse l'acces a un %s", async (role) => {
    const user = await createUser({ role, email: `${role.toLowerCase()}@test.example` });
    const cookie = await loginCookie("web", user.email);
    const res = await get(cookie, WEB_ORIGIN);
    expect(res.status).toBe(403);
  });

  it("compte les utilisateurs par role, les formations, sessions et inscriptions", async () => {
    const cookie = await adminCookie();
    await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const l1 = await createLearner(1);
    await createLearner(2);
    const c1 = await createCourse({ name: "A" });
    await createCourse({ name: "B" });
    await createSessionWith(c1.id);
    await enroll(l1.id, c1.id);
    const res = await get(cookie);
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ learners: 2, trainers: 1, courses: 2, sessions: 1, enrollments: 1 });
  });

  it("renvoie six mois d'inscriptions, mois vides inclus, hors inscriptions plus anciennes", async () => {
    const cookie = await adminCookie();
    const course = await createCourse({ name: "Compta" });
    const learners = [];
    for (const n of [1, 2, 3, 4]) learners.push(await createLearner(n));
    await enroll(learners[0].id, course.id);
    await enroll(learners[1].id, course.id);
    const older = await enroll(learners[2].id, course.id);
    await prisma.enrollment.update({ where: { id: older.id }, data: { createdAt: inMonth(2) } });
    const tooOld = await enroll(learners[3].id, course.id);
    await prisma.enrollment.update({ where: { id: tooOld.id }, data: { createdAt: inMonth(8) } });
    const res = await get(cookie);
    const months = res.body.enrollmentsByMonth as { month: string; count: number }[];
    expect(months.map((m) => m.month)).toEqual([5, 4, 3, 2, 1, 0].map(monthKey));
    expect(months.map((m) => m.count)).toEqual([0, 0, 0, 1, 0, 2]);
  });

  it("liste au plus cinq sessions a venir, dans l'ordre, sans les sessions passees", async () => {
    const cookie = await adminCookie();
    const course = await createCourse({ name: "A" });
    await createSessionWith(course.id, { startsInHours: -5 });
    const created: { hours: number; id: string }[] = [];
    for (const hours of [6, 2, 5, 1, 4, 3]) {
      const s = await createSessionWith(course.id, { startsInHours: hours });
      created.push({ hours, id: s.id });
    }
    const expected = [...created].sort((a, b) => a.hours - b.hours).slice(0, 5).map((s) => s.id);
    const res = await get(cookie);
    expect((res.body.upcomingSessions as { id: string }[]).map((s) => s.id)).toEqual(expected);
  });

  it("expose la formation et le formateur en { id, name } et les inscrits actifs", async () => {
    const cookie = await adminCookie();
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example", name: "Sara Benali" });
    const course = await createCourse({ name: "Compta" });
    const session = await createSessionWith(course.id, { trainerId: trainer.id, capacity: 10 });
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    const l3 = await createLearner(3);
    await enroll(l1.id, course.id, "CONFIRMED");
    await enroll(l2.id, course.id, "PENDING");
    await enroll(l3.id, course.id, "CANCELLED");
    const res = await get(cookie);
    expect(res.body.upcomingSessions).toHaveLength(1);
    expect(res.body.upcomingSessions[0]).toMatchObject({
      id: session.id,
      location: "Salle B2",
      capacity: 10,
      enrolled: 2,
      course: { id: course.id, name: "Compta" },
      trainer: { id: trainer.id, name: "Sara Benali" },
    });
  });

  it("compte les comptes en attente, les inscriptions en attente et les sessions a venir sans formateur", async () => {
    const cookie = await adminCookie();
    await createUser({ role: "LEARNER", email: "p1@test.example", status: "PENDING" });
    await createUser({ role: "LEARNER", email: "p2@test.example", status: "PENDING" });
    const trainer = await createUser({ role: "TRAINER", email: "trainer@test.example" });
    const course = await createCourse({ name: "A" });
    const l1 = await createLearner(1);
    const l2 = await createLearner(2);
    await enroll(l1.id, course.id, "PENDING");
    await enroll(l2.id, course.id, "CONFIRMED");
    await createSessionWith(course.id, { startsInHours: 2 });
    await createSessionWith(course.id, { startsInHours: -3 });
    await createSessionWith(course.id, { startsInHours: 4, trainerId: trainer.id });
    const res = await get(cookie);
    expect(res.body.alerts).toEqual({ pendingAccounts: 2, pendingEnrollments: 1, sessionsWithoutTrainer: 1 });
  });
});