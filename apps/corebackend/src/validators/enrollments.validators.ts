import { z } from "zod";

const statusSchema = z.enum(["PENDING", "CONFIRMED", "CANCELLED"]);
const idSchema = z.string().trim().min(1).max(64);

export const listEnrollmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: statusSchema.optional(),
  courseId: idSchema.optional(),
  studentId: idSchema.optional(),
  sort: z.enum(["createdAt", "progress"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// Une inscription ne se cree jamais directement annulee ; la progression n'est pas editable a la creation.
export const createEnrollmentSchema = z.strictObject({
  studentId: idSchema,
  courseId: idSchema,
  status: z.enum(["PENDING", "CONFIRMED"]).default("PENDING"),
});

// studentId et courseId ne sont pas modifiables : on annule puis on reinscrit.
export const updateEnrollmentSchema = z
  .strictObject({
    status: statusSchema.optional(),
    progress: z.number().int().min(0).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Au moins un champ est requis." });

export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;