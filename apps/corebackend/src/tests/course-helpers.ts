import { prisma } from "../lib/prisma.js";

type CourseStatusName = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type EnrollmentStatusName = "PENDING" | "CONFIRMED" | "CANCELLED";

export async function createCourse(
  overrides: {
    name?: string;
    category?: string;
    status?: CourseStatusName;
    trainerId?: string | null;
    durationHours?: number;
    description?: string;
  } = {},
) {
  return prisma.course.create({
    data: {
      name: overrides.name ?? "Formation Test",
      category: overrides.category ?? "Gestion",
      durationHours: overrides.durationHours ?? 20,
      status: overrides.status ?? "PUBLISHED",
      trainerId: overrides.trainerId ?? null,
      description: overrides.description ?? null,
    },
  });
}

export async function enroll(studentId: string, courseId: string, status: EnrollmentStatusName = "CONFIRMED") {
  return prisma.enrollment.create({ data: { studentId, courseId, status } });
}

export async function createTrainingSession(courseId: string, trainerId: string | null = null) {
  const startsAt = new Date(Date.now() + 86_400_000);
  return prisma.trainingSession.create({
    data: {
      courseId,
      trainerId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 3_600_000),
      location: "Salle A1",
      capacity: 20,
    },
  });
}