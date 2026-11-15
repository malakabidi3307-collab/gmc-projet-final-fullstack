import { config } from "dotenv";
import { z } from "zod";

// En test, seules les variables de .env.test (chargees par Vitest) comptent.
if (process.env.NODE_ENV !== "test") {
  config({ quiet: true });
}

const origin = z.url().transform((value) => new URL(value).origin);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    WEB_ORIGIN: origin.default("http://localhost:3000"),
    ADMIN_ORIGIN: origin.default("http://localhost:3001"),
    JWT_SECRET: z.string().min(32),
    SESSION_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(480),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    COOKIE_DOMAIN: z.string().min(1).optional(),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).default(15),
  })
  .transform((value) => ({ ...value, CORS_ORIGINS: [value.WEB_ORIGIN, value.ADMIN_ORIGIN] }));

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Uniquement les NOMS des variables invalides, jamais leurs valeurs (secrets).
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Configuration invalide. Variables a corriger : ${names.join(", ")}`);
  }
  return result.data;
}

export const env = loadEnv();