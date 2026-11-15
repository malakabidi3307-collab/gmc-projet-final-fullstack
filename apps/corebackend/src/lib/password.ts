import { hash, verify } from "@node-rs/argon2";

// Argon2id avec les parametres minimaux recommandes par l'OWASP (19 Mio, 2 passes).
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/** Fait le meme calcul qu'une verification reelle : un compte inconnu prend autant de temps qu'un mauvais mot de passe. */
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= hashPassword("ifag-dummy-password");
  await verifyPassword(await dummyHash, plain);
}