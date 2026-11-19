import { CLIENT_ROLES, type ClientApp, type RoleName } from "../config/clients.js";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { generateRefreshToken, hashRefreshToken } from "../lib/refresh-token.js";
import { issueAccessToken } from "../lib/tokens.js";
import type { SessionTokens } from "../types/auth.js";
import type { ChangePasswordInput, LoginInput } from "../validators/auth.validators.js";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
}

const invalidCredentials = () => new AppError(401, "INVALID_CREDENTIALS", "Identifiants incorrects.");
const invalidRefresh = () => new AppError(401, "INVALID_REFRESH_TOKEN", "Session expiree ou invalide.");
const refreshConflict = () =>
  new AppError(409, "REFRESH_CONFLICT", "Renouvellement deja effectue, reessayez avec les nouveaux cookies.");

const toPublicUser = (user: { id: string; name: string; email: string; role: RoleName }): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

async function createSession(
  user: { id: string; role: RoleName; tokenVersion: number },
  app: ClientApp,
  userAgent?: string,
): Promise<SessionTokens> {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 86_400_000);
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      app,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
  });
  const accessToken = await issueAccessToken(user, app, session.id);
  return { accessToken, refreshToken, expiresAt };
}

export async function login(
  input: LoginInput,
  userAgent?: string,
): Promise<{ tokens: SessionTokens; user: PublicUser }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const now = new Date();

  // Compte inconnu ou verrouille : meme reponse et meme duree de calcul qu'un mauvais mot de passe.
  if (!user || (user.lockedUntil !== null && user.lockedUntil > now)) {
    await burnPasswordCheck(input.password);
    throw invalidCredentials();
  }

  if (!(await verifyPassword(user.passwordHash, input.password))) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    if (updated.failedLoginCount >= env.LOGIN_MAX_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + env.LOGIN_LOCK_MINUTES * 60_000) },
      });
    }
    throw invalidCredentials();
  }

  if (user.status !== "ACTIVE") {
    throw invalidCredentials();
  }
  if (!CLIENT_ROLES[input.client].includes(user.role)) {
    throw new AppError(403, "FORBIDDEN_CLIENT", "Ce compte n'a pas acces a cette application.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });
  const tokens = await createSession(user, input.client, userAgent);
  return { tokens, user: toPublicUser(user) };
}

/** Un ancien refresh token rejoue : simple course (409) dans le delai de grace, vol presume (revocation) apres. */
async function handlePossibleReuse(hash: string, app: ClientApp, now: Date): Promise<void> {
  const previous = await prisma.authSession.findFirst({ where: { previousRefreshTokenHash: hash } });
  if (!previous || previous.app !== app) return;
  const rotatedAt = previous.rotatedAt?.getTime() ?? 0;
  const withinGrace = previous.revokedAt === null && now.getTime() - rotatedAt <= env.REFRESH_REUSE_GRACE_SECONDS * 1000;
  if (withinGrace) throw refreshConflict();
  if (previous.revokedAt === null) {
    await prisma.authSession.update({ where: { id: previous.id }, data: { revokedAt: now } });
  }
}

export async function refresh(
  app: ClientApp,
  token: string,
): Promise<{ tokens: SessionTokens; user: PublicUser }> {
  if (!token) throw invalidRefresh();
  const now = new Date();
  const hash = hashRefreshToken(token);

  const session = await prisma.authSession.findUnique({ where: { refreshTokenHash: hash }, include: { user: true } });
  if (!session) {
    await handlePossibleReuse(hash, app, now);
    throw invalidRefresh();
  }
  if (session.app !== app || session.revokedAt !== null || session.expiresAt <= now) throw invalidRefresh();

  const { user } = session;
  if (user.status !== "ACTIVE" || !CLIENT_ROLES[app].includes(user.role)) throw invalidRefresh();

  const newToken = generateRefreshToken();
  const rotated = await prisma.authSession.updateMany({
    where: { id: session.id, refreshTokenHash: hash, revokedAt: null },
    data: {
      refreshTokenHash: hashRefreshToken(newToken),
      previousRefreshTokenHash: hash,
      rotatedAt: now,
      lastUsedAt: now,
    },
  });
  if (rotated.count !== 1) throw refreshConflict();

  const accessToken = await issueAccessToken(user, app, session.id);
  return { tokens: { accessToken, refreshToken: newToken, expiresAt: session.expiresAt }, user: toPublicUser(user) };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.authSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeByRefreshToken(app: ClientApp, token: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { refreshTokenHash: hashRefreshToken(token), app, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Change le mot de passe, revoque TOUTES les sessions, puis ouvre une nouvelle session pour l'appareil courant. */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  app: ClientApp,
  userAgent?: string,
): Promise<SessionTokens> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Mot de passe actuel incorrect.");
  }
  if (input.currentPassword === input.newPassword) {
    throw new AppError(400, "PASSWORD_UNCHANGED", "Le nouveau mot de passe doit etre different de l'ancien.");
  }
  const passwordHash = await hashPassword(input.newPassword);
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
      select: { id: true, role: true, tokenVersion: true },
    }),
    prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  return createSession(updated, app, userAgent);
}