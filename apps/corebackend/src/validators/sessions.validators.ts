import { z } from "zod";

const isoDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const locationSchema = z.string().trim().min(2).max(150);
const capacitySchema = z.number().int().min(1).max(10_000);
const trainerIdSchema = z.string().trim().min(1).max(64).nullable().optional();

export const listSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  courseId: z.string().trim().min(1).max(64).optional(),
  trainerId: z.string().trim().min(1).max(64).optional(),
  sort: z.enum(["startsAt", "capacity"]).default("startsAt"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

// strictObject : tout champ inconnu est refuse.
export const createSessionSchema = z.strictObject({
  courseId: z.string().trim().min(1).max(64),
  startsAt: isoDate,
  endsAt: isoDate,
  location: locationSchema,
  capacity: capacitySchema,
  trainerId: trainerIdSchema,
});

// courseId n'est volontairement pas modifiable : une session ne change pas de formation.
export const updateSessionSchema = z
  .strictObject({
    startsAt: isoDate.optional(),
    endsAt: isoDate.optional(),
    location: locationSchema.optional(),
    capacity: capacitySchema.optional(),
    trainerId: trainerIdSchema,
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Au moins un champ est requis." });

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;