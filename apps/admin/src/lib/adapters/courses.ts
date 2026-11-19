import type { ApiBinding } from "../resource";
import type { Course, CourseStatus } from "@/types";

/** Contrat de GET /api/courses (un element de { data }) et de { course }. */
export interface CourseDto {
  id: string;
  name: string;
  category: string;
  description: string | null;
  objectives: string | null;
  prerequisites: string | null;
  modules: string | null;
  durationHours: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
  trainer: { id: string; name: string } | null;
  enrolled?: number;
}

const STATUS_FROM_API: Record<CourseDto["status"], CourseStatus> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
};
const STATUS_TO_API: Record<CourseStatus, CourseDto["status"]> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED",
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" });

/** Un texte vide devient null : le backend stocke l'absence de valeur, pas une chaine vide. */
function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const coursesBinding: ApiBinding<Course, CourseDto> = {
  path: "/courses",
  itemKey: "course",
  fromApi: (dto) => ({
    id: dto.id,
    name: dto.name,
    category: dto.category,
    description: dto.description ?? "",
    objectives: dto.objectives ?? "",
    prerequisites: dto.prerequisites ?? "",
    modules: dto.modules ?? "",
    trainer: dto.trainer?.name ?? null,
    trainerId: dto.trainer?.id ?? null,
    enrolled: dto.enrolled ?? 0,
    durationHours: dto.durationHours,
    status: STATUS_FROM_API[dto.status],
    updatedAt: dateFormat.format(new Date(dto.updatedAt)),
  }),
  toCreate: (input) => ({
    name: input.name.trim(),
    category: input.category.trim(),
    durationHours: input.durationHours,
    status: STATUS_TO_API[input.status],
    description: text(input.description),
    objectives: text(input.objectives),
    prerequisites: text(input.prerequisites),
    modules: text(input.modules),
    trainerId: input.trainerId ?? null,
  }),
  toUpdate: (patch) => ({
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.category !== undefined ? { category: patch.category.trim() } : {}),
    ...(patch.durationHours !== undefined ? { durationHours: patch.durationHours } : {}),
    ...(patch.status !== undefined ? { status: STATUS_TO_API[patch.status] } : {}),
    ...(patch.description !== undefined ? { description: text(patch.description) } : {}),
    ...(patch.objectives !== undefined ? { objectives: text(patch.objectives) } : {}),
    ...(patch.prerequisites !== undefined ? { prerequisites: text(patch.prerequisites) } : {}),
    ...(patch.modules !== undefined ? { modules: text(patch.modules) } : {}),
    ...(patch.trainerId !== undefined ? { trainerId: patch.trainerId } : {}),
  }),
};