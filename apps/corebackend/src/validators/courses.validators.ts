import { z } from "zod";

const statusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const nameSchema = z.string().trim().min(2).max(150);
const categorySchema = z.string().trim().min(2).max(80);
const durationSchema = z.number().int().min(1).max(2000);
const longText = z.string().trim().max(5000).nullable().optional();
const trainerIdSchema = z.string().trim().min(1).max(64).nullable().optional();

export const listCoursesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).max(100).optional(),
  status: statusSchema.optional(),
  category: z.string().trim().min(1).max(80).optional(),
  trainerId: z.string().trim().min(1).max(64).optional(),
  sort: z.enum(["createdAt", "updatedAt", "name", "durationHours"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// strictObject : tout champ inconnu (enrolled, createdAt...) est refuse.
export const createCourseSchema = z.strictObject({
  name: nameSchema,
  category: categorySchema,
  durationHours: durationSchema,
  status: statusSchema.default("DRAFT"),
  description: longText,
  objectives: longText,
  prerequisites: longText,
  modules: longText,
  trainerId: trainerIdSchema,
});

export const updateCourseSchema = z
  .strictObject({
    name: nameSchema.optional(),
    category: categorySchema.optional(),
    durationHours: durationSchema.optional(),
    status: statusSchema.optional(),
    description: longText,
    objectives: longText,
    prerequisites: longText,
    modules: longText,
    trainerId: trainerIdSchema,
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Au moins un champ est requis." });

export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;