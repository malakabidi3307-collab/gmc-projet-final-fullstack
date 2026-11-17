import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/authenticate.js";
import type { CreateSessionInput, ListSessionsQuery, UpdateSessionInput } from "../validators/sessions.validators.js";
import { assertAssignableTrainer, visibleTo } from "./courses.service.js";

const sessionSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  location: true,
  capacity: true,
  course: { select: { id: true, name: true } },
  trainer: { select: { id: true, name: true } },
} as const;

const sessionNotFound = () => new AppError(404, "SESSION_NOT_FOUND", "Session introuvable.");

/** Une session est visible quand sa formation l'est (meme perimetre que les formations). */
function scopeOf(actor: AuthUser) {
  return { course: { is: visibleTo(actor) } };
}

function assertDates(startsAt: Date, endsAt: Date): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new AppError(400, "INVALID_DATES", "La date de fin doit etre posterieure a la date de debut.");
  }
}

/** La capacite d'une session ne peut pas passer sous le nombre d'inscriptions actives de sa formation. */
async function assertCapacityCoversEnrollments(courseId: string, capacity: number): Promise<void> {
  const active = await prisma.enrollment.count({ where: { courseId, status: { not: "CANCELLED" } } });
  if (active > capacity) {
    throw new AppError(
      409,
      "CAPACITY_TOO_LOW",
      `La capacite doit etre au moins egale au nombre d'inscriptions actives (${active}).`,
    );
  }
}

export async function listSessions(actor: AuthUser, query: ListSessionsQuery) {
  const filters = {
    ...(query.courseId ? { courseId: query.courseId } : {}),
    ...(query.trainerId ? { trainerId: query.trainerId } : {}),
  };
  const where = { AND: [scopeOf(actor), filters] };
  const orderBy = query.sort === "capacity" ? { capacity: query.order } : { startsAt: query.order };

  const [total, rows] = await prisma.$transaction([
    prisma.trainingSession.count({ where }),
    prisma.trainingSession.findMany({
      where,
      select: sessionSelect,
      orderBy: [orderBy, { id: "asc" as const }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    data: rows,
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
  };
}

export async function getSession(actor: AuthUser, id: string) {
  const row = await prisma.trainingSession.findFirst({ where: { AND: [{ id }, scopeOf(actor)] }, select: sessionSelect });
  if (!row) throw sessionNotFound();
  return row;
}

export async function createSession(input: CreateSessionInput) {
  const course = await prisma.course.findUnique({ where: { id: input.courseId }, select: { status: true } });
  if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "Formation introuvable.");
  if (course.status === "ARCHIVED") {
    throw new AppError(409, "COURSE_ARCHIVED", "Impossible d'ajouter une session a une formation archivee.");
  }
  assertDates(input.startsAt, input.endsAt);
  if (input.trainerId) {
    await assertAssignableTrainer(input.trainerId);
  }
  await assertCapacityCoversEnrollments(input.courseId, input.capacity);
  return prisma.trainingSession.create({
    data: {
      courseId: input.courseId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      capacity: input.capacity,
      trainerId: input.trainerId ?? null,
    },
    select: sessionSelect,
  });
}

export async function updateSession(id: string, input: UpdateSessionInput) {
  const existing = await prisma.trainingSession.findUnique({
    where: { id },
    select: { courseId: true, trainerId: true, startsAt: true, endsAt: true },
  });
  if (!existing) throw sessionNotFound();
  assertDates(input.startsAt ?? existing.startsAt, input.endsAt ?? existing.endsAt);
  // Seul un changement de formateur est controle : un formateur desactive plus tard ne bloque pas les autres edits.
  if (input.trainerId && input.trainerId !== existing.trainerId) {
    await assertAssignableTrainer(input.trainerId);
  }
  if (input.capacity !== undefined) {
    await assertCapacityCoversEnrollments(existing.courseId, input.capacity);
  }
  return prisma.trainingSession.update({
    where: { id },
    data: {
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      capacity: input.capacity,
      trainerId: input.trainerId,
    },
    select: sessionSelect,
  });
}

export async function deleteSession(id: string): Promise<void> {
  const session = await prisma.trainingSession.findUnique({
    where: { id },
    select: { _count: { select: { attendances: true } } },
  });
  if (!session) throw sessionNotFound();
  if (session._count.attendances > 0) {
    throw new AppError(409, "SESSION_IN_USE", "Cette session a des presences enregistrees : elle ne peut pas etre supprimee.");
  }
  await prisma.trainingSession.delete({ where: { id } });
}