import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/authenticate.js";
import type {
  CreateEnrollmentInput,
  ListEnrollmentsQuery,
  UpdateEnrollmentInput,
} from "../validators/enrollments.validators.js";
import { visibleTo } from "./courses.service.js";

const enrollmentSelect = {
  id: true,
  status: true,
  progress: true,
  createdAt: true,
  student: { select: { id: true, name: true } },
  course: { select: { id: true, name: true } },
} as const;

const enrollmentNotFound = () => new AppError(404, "ENROLLMENT_NOT_FOUND", "Inscription introuvable.");
const alreadyEnrolled = () => new AppError(409, "ALREADY_ENROLLED", "Cet apprenant est deja inscrit a cette formation.");

/** ADMIN : tout. LEARNER : ses inscriptions. TRAINER : celles des formations de son perimetre. */
function scopeOf(actor: AuthUser) {
  if (actor.role === "ADMIN") {
    return {};
  }
  if (actor.role === "LEARNER") {
    return { studentId: actor.id };
  }
  return { course: { is: visibleTo(actor) } };
}

async function assertCourseOpen(courseId: string): Promise<void> {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true } });
  if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "Formation introuvable.");
  if (course.status !== "PUBLISHED") {
    throw new AppError(409, "COURSE_NOT_OPEN", "Cette formation n'est pas ouverte aux inscriptions.");
  }
}

/** Limite = plus petite capacite parmi les sessions de la formation (aucune session : pas de limite). */
async function assertSeatAvailable(courseId: string): Promise<void> {
  const [limit, active] = await Promise.all([
    prisma.trainingSession.aggregate({ where: { courseId }, _min: { capacity: true } }),
    prisma.enrollment.count({ where: { courseId, status: { not: "CANCELLED" } } }),
  ]);
  const minCapacity = limit._min.capacity;
  if (minCapacity !== null && active >= minCapacity) {
    throw new AppError(409, "SESSION_FULL", "La capacite maximale de cette formation est atteinte.");
  }
}

export async function listEnrollments(actor: AuthUser, query: ListEnrollmentsQuery) {
  const filters = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.courseId ? { courseId: query.courseId } : {}),
    ...(query.studentId ? { studentId: query.studentId } : {}),
  };
  const where = { AND: [scopeOf(actor), filters] };
  const orderBy = query.sort === "progress" ? { progress: query.order } : { createdAt: query.order };

  const [total, rows] = await prisma.$transaction([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      select: enrollmentSelect,
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

export async function getEnrollment(actor: AuthUser, id: string) {
  const row = await prisma.enrollment.findFirst({ where: { AND: [{ id }, scopeOf(actor)] }, select: enrollmentSelect });
  if (!row) throw enrollmentNotFound();
  return row;
}

export async function createEnrollment(input: CreateEnrollmentInput) {
  const student = await prisma.user.findUnique({ where: { id: input.studentId }, select: { role: true, status: true } });
  if (!student || student.role !== "LEARNER" || student.status !== "ACTIVE") {
    throw new AppError(400, "INVALID_STUDENT", "L'apprenant indique est introuvable, inactif ou n'a pas le role apprenant.");
  }
  await assertCourseOpen(input.courseId);

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: input.studentId, courseId: input.courseId } },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== "CANCELLED") {
    throw alreadyEnrolled();
  }
  await assertSeatAvailable(input.courseId);

  try {
    // Reinscription : la ligne annulee est reactivee (la contrainte unique interdit d'en creer une seconde).
    if (existing) {
      return await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: input.status },
        select: enrollmentSelect,
      });
    }
    return await prisma.enrollment.create({
      data: { studentId: input.studentId, courseId: input.courseId, status: input.status },
      select: enrollmentSelect,
    });
  } catch (error) {
    // Course entre deux requetes simultanees : la contrainte unique reste la derniere protection.
    if ((error as { code?: string }).code === "P2002") throw alreadyEnrolled();
    throw error;
  }
}

export async function updateEnrollment(id: string, input: UpdateEnrollmentInput) {
  const existing = await prisma.enrollment.findUnique({ where: { id }, select: { courseId: true, status: true } });
  if (!existing) throw enrollmentNotFound();
  // Reactiver une inscription annulee rouvre une place : meme controles qu'a l'inscription.
  if (existing.status === "CANCELLED" && input.status && input.status !== "CANCELLED") {
    await assertCourseOpen(existing.courseId);
    await assertSeatAvailable(existing.courseId);
  }
  return prisma.enrollment.update({
    where: { id },
    data: { status: input.status, progress: input.progress },
    select: enrollmentSelect,
  });
}

export async function cancelEnrollment(actor: AuthUser, id: string) {
  if (actor.role === "TRAINER") {
    throw new AppError(403, "FORBIDDEN", "Action reservee aux administrateurs et aux apprenants concernes.");
  }
  const row = await prisma.enrollment.findFirst({ where: { AND: [{ id }, scopeOf(actor)] }, select: enrollmentSelect });
  if (!row) throw enrollmentNotFound();
  if (row.status === "CANCELLED") return row;
  return prisma.enrollment.update({ where: { id }, data: { status: "CANCELLED" }, select: enrollmentSelect });
}