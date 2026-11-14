import { config } from "dotenv";
import { z } from "zod";

// En test, seules les variables de .env.test (chargees par Vitest) comptent :
// on ne lit jamais le .env de developpement.
if (process.env.NODE_ENV !== "test") {
  config({ quiet: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // On liste uniquement les NOMS des variables invalides, jamais leurs valeurs (secrets).
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Configuration invalide. Variables a corriger : ${names.join(", ")}`);
  }
  return result.data;
}

export const env = loadEnv();