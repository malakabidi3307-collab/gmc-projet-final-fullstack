import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "TRAINER", "LEARNER"]);
const statusSchema = z.enum(["ACTIVE", "PENDING", "DISABLED"]);
const nameSchema = z.string().trim().min(2).max(100);
const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
const phoneSchema = z.string().trim().min(1).max(30).nullable().optional();
const specialtySchema = z.string().trim().min(1).max(100).nullable().optional();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).max(100).optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  sort: z.enum(["createdAt", "name", "email"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// strictObject : tout champ inconnu (tokenVersion, passwordHash...) est refuse.
export const createUserSchema = z.strictObject({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
  password: z.string().min(12).max(128),
  status: statusSchema.default("ACTIVE"),
  phone: phoneSchema,
  specialty: specialtySchema,
});

export const updateUserSchema = z
  .strictObject({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    role: roleSchema.optional(),
    status: statusSchema.optional(),
    phone: phoneSchema,
    specialty: specialtySchema,
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Au moins un champ est requis." });

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;