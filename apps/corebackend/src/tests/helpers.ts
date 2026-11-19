import { hash } from "@node-rs/argon2";
import type { Response } from "supertest";
import { prisma } from "../lib/prisma.js";

export const WEB_ORIGIN = "http://localhost:3000";
export const ADMIN_ORIGIN = "http://localhost:3001";
export const ADMIN_COOKIE = "ifag_admin_session";
export const WEB_COOKIE = "ifag_web_session";
export const TEST_PASSWORD = "Mot-de-passe-test-2026";

type RoleName = "ADMIN" | "TRAINER" | "LEARNER";
type StatusName = "ACTIVE" | "PENDING" | "DISABLED";

interface UserOverrides {
  email?: string;
  name?: string;
  role?: RoleName;
  status?: StatusName;
  password?: string;
}

export async function createUser(overrides: UserOverrides = {}) {
  // Parametres Argon2 volontairement legers : uniquement pour accelerer les tests.
  const passwordHash = await hash(overrides.password ?? TEST_PASSWORD, {
    memoryCost: 1024,
    timeCost: 1,
    parallelism: 1,
  });
  return prisma.user.create({
    data: {
      name: overrides.name ?? "Utilisateur Test",
      email: overrides.email ?? "user@test.example",
      passwordHash,
      role: overrides.role ?? "LEARNER",
      status: overrides.status ?? "ACTIVE",
    },
  });
}

export async function resetDatabase(): Promise<void> {
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
}

export function setCookies(res: Response): string[] {
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

/** Renvoie "nom=valeur" pret a etre renvoye dans l'en-tete Cookie. */
export function cookieHeader(res: Response, name: string): string | undefined {
  const found = setCookies(res).find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}