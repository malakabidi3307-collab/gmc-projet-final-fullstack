import type { ApiBinding } from "../resource";
import type { SessionRow, SessionStatus } from "@/types";

/** Contrat de GET /api/training-sessions (un element de { data }) et de { session }. */
export interface SessionDto {
  id: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  course: { id: string; name: string };
  trainer: { id: string; name: string } | null;
}

const dayFormat = new Intl.DateTimeFormat("fr-FR");
const hourFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

// Statut deduit de faits connus uniquement (l'API ne renvoie ni inscrits ni statut).
function statusOf(dto: SessionDto): SessionStatus {
  if (new Date(dto.endsAt).getTime() < Date.now()) return "ended";
  if (!dto.trainer) return "no-trainer";
  return "open";
}

export const sessionsBinding: ApiBinding<SessionRow, SessionDto> = {
  path: "/training-sessions",
  itemKey: "session",
  fromApi: (dto) => {
    const start = new Date(dto.startsAt);
    const end = new Date(dto.endsAt);
    return {
      id: dto.id,
      course: dto.course.name,
      courseId: dto.course.id,
      trainer: dto.trainer?.name ?? null,
      trainerId: dto.trainer?.id ?? null,
      start: dayFormat.format(start),
      end: dayFormat.format(end),
      time: `${hourFormat.format(start)}–${hourFormat.format(end)}`,
      startsAtIso: dto.startsAt,
      endsAtIso: dto.endsAt,
      location: dto.location,
      capacity: dto.capacity,
      status: statusOf(dto),
    };
  },
  toCreate: (input) => ({
    courseId: input.courseId,
    startsAt: input.startsAtIso,
    endsAt: input.endsAtIso,
    location: input.location.trim(),
    capacity: input.capacity,
    trainerId: input.trainerId ?? null,
  }),
  // courseId n'est jamais envoye : une session ne change pas de formation.
  toUpdate: (patch) => ({
    ...(patch.startsAtIso !== undefined ? { startsAt: patch.startsAtIso } : {}),
    ...(patch.endsAtIso !== undefined ? { endsAt: patch.endsAtIso } : {}),
    ...(patch.location !== undefined ? { location: patch.location.trim() } : {}),
    ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
    ...(patch.trainerId !== undefined ? { trainerId: patch.trainerId } : {}),
  }),
};