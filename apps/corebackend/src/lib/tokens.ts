import { SignJWT, jwtVerify } from "jose";
import type { ClientApp } from "../config/clients.js";
import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "ifag-api";

export interface AccessTokenClaims {
  sub: string;
  role: string;
  tv: number;
  app: ClientApp;
  sid: string;
}

export async function issueAccessToken(
  user: { id: string; role: string; tokenVersion: number },
  app: ClientApp,
  sessionId: string,
  options: { ttlSeconds?: number } = {},
): Promise<string> {
  const ttl = options.ttlSeconds ?? env.ACCESS_TTL_MINUTES * 60;
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: user.role, tv: user.tokenVersion, app, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(app)
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .sign(secret);
}

export async function verifyAccessToken(token: string, app: ClientApp): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: app,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.tv !== "number" || typeof payload.sid !== "string") {
      return null;
    }
    return { sub: payload.sub, role: String(payload.role), tv: payload.tv, app, sid: payload.sid };
  } catch {
    return null;
  }
}