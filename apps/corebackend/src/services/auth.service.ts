import { CLIENT_ROLES, type ClientApp, type RoleName } from "../config/clients.js";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { issueAccessToken } from "../lib/tokens.js";
import type { ChangePasswordInput, LoginInput } from "../validators/auth.validators.js";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
}

const invalidCredentials = () => new AppError(401, "INVALID_CREDENTIALS", "Identifiants incorrects.");

export async function login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
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
  const token = await issueAccessToken(user, input.client);
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

/** Invalide tous les jetons deja emis pour cet utilisateur. */
export async function revokeSessions(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

/** Change le mot de passe, revoque les anciens jetons et renvoie un nouveau jeton pour la session courante. */
export async function changePassword(userId: string, input: ChangePasswordInput, app: ClientApp): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Mot de passe actuel incorrect.");
  }
  if (input.currentPassword === input.newPassword) {
    throw new AppError(400, "PASSWORD_UNCHANGED", "Le nouveau mot de passe doit etre different de l'ancien.");
  }
  const passwordHash = await hashPassword(input.newPassword);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
    select: { id: true, role: true, tokenVersion: true },
  });
  return issueAccessToken(updated, app);
}