import { createHash, randomBytes } from "node:crypto";

/** 384 bits d'entropie : un hash SHA-256 sans sel suffit (pas de mot de passe a deviner). */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}