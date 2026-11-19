import { prisma } from "../lib/prisma.js";

const MONTHS = 6;
const UPCOMING_LIMIT = 5;

const monthKey = (date: Date) => date.toISOString().slice(0, 7);

export async function getDashboard(now: Date = new Date()) {
  // Fenetre de six mois calendaires, en UTC (les dates sont stockees en UTC).
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));

  const [
    learners,
    trainers,
    courses,
    sessions,
    enrollments,
    monthlyRows,
    upcoming,
    pendingAccounts,
    pendingEnrollments,
    sessionsWithoutTrainer,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "LEARNER" } }),
    prisma.user.count({ where: { role: "TRAINER" } }),
    prisma.course.count(),
    prisma.trainingSession.count(),
    prisma.enrollment.count(),
    prisma.$queryRaw<{ month: string; count: number }[]>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM "enrollments"
      WHERE "createdAt" >= ${since}
      GROUP BY 1
    `,
    prisma.trainingSession.findMany({
      where: { startsAt: { gte: now } },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: UPCOMING_LIMIT,
      select: {
        id: true,
        startsAt: true,
        location: true,
        capacity: true,
        courseId: true,
        course: { select: { id: true, name: true } },
        trainer: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.enrollment.count({ where: { status: "PENDING" } }),
    prisma.trainingSession.count({ where: { startsAt: { gte: now }, trainerId: null } }),
  ]);

  const counts = new Map(monthlyRows.map((row) => [row.month, row.count]));
  const enrollmentsByMonth = Array.from({ length: MONTHS }, (_, index) => {
    const month = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1 - index), 1)));
    return { month, count: counts.get(month) ?? 0 };
  });

  // Inscrits d'une session = inscriptions actives de sa formation (l'inscription n'est pas liee a une session).
  const courseIds = [...new Set(upcoming.map((session) => session.courseId))];
  const grouped = courseIds.length
    ? await prisma.enrollment.groupBy({
        by: ["courseId"],
        where: { courseId: { in: courseIds }, status: { not: "CANCELLED" } },
        _count: { _all: true },
      })
    : [];
  const activeByCourse = new Map(grouped.map((row) => [row.courseId, row._count._all]));

  return {
    totals: { learners, trainers, courses, sessions, enrollments },
    enrollmentsByMonth,
    upcomingSessions: upcoming.map(({ courseId, ...session }) => ({
      ...session,
      enrolled: activeByCourse.get(courseId) ?? 0,
    })),
    alerts: { pendingAccounts, pendingEnrollments, sessionsWithoutTrainer },
  };
}