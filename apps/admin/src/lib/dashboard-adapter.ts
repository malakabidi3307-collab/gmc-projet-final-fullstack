import type { DashboardAlert, DashboardData, Stat, UpcomingSession } from "@/types";

/** Contrat de GET /api/admin/dashboard. */
export interface DashboardDto {
  totals: { learners: number; trainers: number; courses: number; sessions: number; enrollments: number };
  enrollmentsByMonth: { month: string; count: number }[];
  upcomingSessions: {
    id: string;
    startsAt: string;
    location: string;
    capacity: number;
    enrolled: number;
    course: { id: string; name: string };
    trainer: { id: string; name: string } | null;
  }[];
  alerts: { pendingAccounts: number; pendingEnrollments: number; sessionsWithoutTrainer: number };
}

const number = new Intl.NumberFormat("fr-FR");
const monthFormat = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return monthFormat.format(new Date(Date.UTC(year, month - 1, 1)));
}

const plural = (n: number, one: string, many: string) => `${number.format(n)} ${n > 1 ? many : one}`;

const longMonth = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

function periodLabel(keys: string[]): string | undefined {
  if (keys.length === 0) return undefined;
  const toDate = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
  };
  const first = longMonth.format(toDate(keys[0]));
  const last = longMonth.format(toDate(keys[keys.length - 1]));
  return first === last ? first : `${first} à ${last}`;
}
export function toDashboardData(dto: DashboardDto): DashboardData {
  const { totals } = dto;
  const stats: Stat[] = [
    { label: "Apprenants", value: number.format(totals.learners) },
    { label: "Formateurs", value: number.format(totals.trainers) },
    { label: "Formations", value: number.format(totals.courses) },
    { label: "Sessions (total)", value: number.format(totals.sessions) },
    { label: "Inscriptions", value: number.format(totals.enrollments) },
  ];

  const sessions: UpcomingSession[] = dto.upcomingSessions.map((s) => ({
    id: s.id,
    course: s.course.name,
    trainer: s.trainer?.name ?? null,
    startsAt: dateFormat.format(new Date(s.startsAt)),
    location: s.location,
    enrolled: s.enrolled,
    capacity: s.capacity,
  }));

  const { alerts: counts } = dto;
  const alerts: DashboardAlert[] = [];
  if (counts.sessionsWithoutTrainer > 0) {
    alerts.push({
      id: "sessions-without-trainer",
      tone: "warning",
      text: `${plural(counts.sessionsWithoutTrainer, "session à venir sans formateur", "sessions à venir sans formateur")}`,
    });
  }
  if (counts.pendingEnrollments > 0) {
    alerts.push({
      id: "pending-enrollments",
      tone: "info",
      text: `${plural(counts.pendingEnrollments, "inscription en attente de confirmation", "inscriptions en attente de confirmation")}`,
    });
  }
  if (counts.pendingAccounts > 0) {
    alerts.push({
      id: "pending-accounts",
      tone: "info",
      text: `${plural(counts.pendingAccounts, "compte en attente d'activation", "comptes en attente d'activation")}`,
    });
  }

  return {
    stats,
    sessions,
    alerts,
    months: dto.enrollmentsByMonth.map((m) => monthLabel(m.month)),
    period: periodLabel(dto.enrollmentsByMonth.map((m) => m.month)),
    enrollments: dto.enrollmentsByMonth.map((m) => m.count),
  };
}