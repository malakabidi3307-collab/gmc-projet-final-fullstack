import { prisma } from "../lib/prisma.js";
import { createUser } from "./helpers.js";

export function createLearner(n: number) {
  return createUser({ role: "LEARNER", email: `learner${n}@test.example` });
}

export async function createSessionWith(
  courseId: string,
  options: { capacity?: number; trainerId?: string | null; startsInHours?: number } = {},
) {
  const startsAt = new Date(Date.now() + (options.startsInHours ?? 24) * 3_600_000);
  return prisma.trainingSession.create({
    data: {
      courseId,
      trainerId: options.trainerId ?? null,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 3_600_000),
      location: "Salle B2",
      capacity: options.capacity ?? 20,
    },
  });
}

export async function markPresent(sessionId: string, studentId: string) {
  return prisma.attendance.create({ data: { sessionId, studentId, status: "PRESENT" } });
}