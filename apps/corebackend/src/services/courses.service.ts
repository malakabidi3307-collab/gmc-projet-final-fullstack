import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/authenticate.js";
import type { CreateCourseInput, ListCoursesQuery, UpdateCourseInput } from "../validators/courses.validators.js";

const courseSelect = {
  id: true,
  name: true,
  category: true,
  description: true,
  objectives: true,
  prerequisites: true,
  modules: true,
  durationHours: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  trainer: { select: { id: true, name: true } },
  _count: { select: { sessions: true, enrollments: { where: { status: "CONFIRMED" as const } } } },
} as const;

const courseNotFound = () => new AppError(404, "COURSE_NOT_FOUND", "Formation introuvable.");

/** Perimetre de lecture : applique a la liste ET au detail (une formation hors perimetre est un 404). */
function visibleTo(actor: AuthUser) {
  if (actor.role === "ADMIN") {
    return {};
  }
  if (actor.role === "TRAINER") {
    return {
      status: { not: "DRAFT" as const },
      OR: [{ trainerId: actor.id }, { sessions: { some: { trainerId: actor.id } } }],
    };
  }
  return {
    status: { not: "DRAFT" as const },
    enrollments: { some: { studentId: actor.id, status: { not: "CANCELLED" as const } } },
  };
}

/** Le nombre d'inscrits n'est pas expose aux apprenants. */
function toCourseDto<T extends { _count: { sessions: number; enrollments: number } }>(actor: AuthUser, row: T) {
  const { _count, ...rest } = row;
  const base = { ...rest, sessionsCount: _count.sessions };
  return actor.role === "LEARNER" ? base : { ...base, enrolled: _count.enrollments };
}

function orderByFor(query: ListCoursesQuery) {
  const direction = query.order;
  switch (query.sort) {
    case "name":
      return { name: direction };
    case "durationHours":
      return { durationHours: direction };
    case "updatedAt":
      return { updatedAt: direction };
    default:
      return { createdAt: direction };
  }
}

async function assertAssignableTrainer(trainerId: string): Promise<void> {
  const trainer = await prisma.user.findUnique({ where: { id: trainerId }, select: { role: true, status: true } });
  if (!trainer || trainer.role !== "TRAINER" || trainer.status !== "ACTIVE") {
    throw new AppError(
      400,
      "INVALID_TRAINER",
      "Le formateur indique est introuvable, inactif ou n'a pas le role formateur.",
    );
  }
}

export async function listCourses(actor: AuthUser, query: ListCoursesQuery) {
  const filters = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: { equals: query.category, mode: "insensitive" as const } } : {}),
    ...(query.trainerId ? { trainerId: query.trainerId } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { category: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  // Perimetre et filtres sont combines par AND : leurs clauses OR ne se melangent jamais.
  const where = { AND: [visibleTo(actor), filters] };

  const [total, rows] = await prisma.$transaction([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      select: courseSelect,
      orderBy: [orderByFor(query), { id: "asc" as const }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    data: rows.map((row) => toCourseDto(actor, row)),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
  };
}

export async function getCourse(actor: AuthUser, id: string) {
  const row = await prisma.course.findFirst({ where: { AND: [{ id }, visibleTo(actor)] }, select: courseSelect });
  if (!row) throw courseNotFound();
  return toCourseDto(actor, row);
}

export async function createCourse(actor: AuthUser, input: CreateCourseInput) {
  if (input.trainerId) {
    await assertAssignableTrainer(input.trainerId);
  }
  const row = await prisma.course.create({
    data: {
      name: input.name,
      category: input.category,
      durationHours: input.durationHours,
      status: input.status,
      description: input.description ?? null,
      objectives: input.objectives ?? null,
      prerequisites: input.prerequisites ?? null,
      modules: input.modules ?? null,
      trainerId: input.trainerId ?? null,
    },
    select: courseSelect,
  });
  return toCourseDto(actor, row);
}

export async function updateCourse(actor: AuthUser, id: string, input: UpdateCourseInput) {
  const existing = await prisma.course.findUnique({ where: { id }, select: { id: true, trainerId: true } });
  if (!existing) throw courseNotFound();
  // Seul un changement de formateur est controle : un formateur desactive plus tard ne bloque pas les autres edits.
  if (input.trainerId && input.trainerId !== existing.trainerId) {
    await assertAssignableTrainer(input.trainerId);
  }
  const row = await prisma.course.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      durationHours: input.durationHours,
      status: input.status,
      description: input.description,
      objectives: input.objectives,
      prerequisites: input.prerequisites,
      modules: input.modules,
      trainerId: input.trainerId,
    },
    select: courseSelect,
  });
  return toCourseDto(actor, row);
}

export async function deleteCourse(id: string): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id },
    select: { _count: { select: { sessions: true, enrollments: true, evaluations: true } } },
  });
  if (!course) throw courseNotFound();
  const { sessions, enrollments, evaluations } = course._count;
  if (sessions + enrollments + evaluations > 0) {
    throw new AppError(
      409,
      "COURSE_IN_USE",
      "Cette formation a des sessions, des inscriptions ou des evaluations : archivez-la plutot que de la supprimer.",
    );
  }
  await prisma.course.delete({ where: { id } });
}