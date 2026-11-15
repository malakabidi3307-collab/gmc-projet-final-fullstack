import { AppError } from "../errors/app-error.js";
import { hashPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/authenticate.js";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "../validators/users.validators.js";

// Liste blanche des champs exposes : jamais de hash, de version de jeton ni de compteur d'echecs.
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  specialty: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

const userNotFound = () => new AppError(404, "USER_NOT_FOUND", "Utilisateur introuvable.");
const emailTaken = () => new AppError(409, "EMAIL_TAKEN", "Cette adresse e-mail est deja utilisee.");

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export async function listUsers(query: ListUsersQuery) {
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { email: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const direction = query.order;
  const primary =
    query.sort === "name" ? { name: direction } : query.sort === "email" ? { email: direction } : { createdAt: direction };

  const [total, data] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [primary, { id: "asc" as const }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    data,
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
  };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw userNotFound();
  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw emailTaken();
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        status: input.status,
        phone: input.phone ?? null,
        specialty: input.specialty ?? null,
        passwordHash,
      },
      select: userSelect,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
}

export async function updateUser(actor: AuthUser, id: string, input: UpdateUserInput) {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, status: true } });
  if (!target) throw userNotFound();

  const roleChanged = input.role !== undefined && input.role !== target.role;
  const statusChanged = input.status !== undefined && input.status !== target.status;
  if (actor.id === id && (roleChanged || statusChanged)) {
    throw new AppError(403, "SELF_MODIFICATION_FORBIDDEN", "Vous ne pouvez pas modifier votre propre role ou statut.");
  }

  if (input.email !== undefined && input.email !== target.email) {
    const taken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (taken) throw emailTaken();
  }

  const data = {
    name: input.name,
    email: input.email,
    role: input.role,
    status: input.status,
    phone: input.phone,
    specialty: input.specialty,
  };

  try {
    if (roleChanged || statusChanged) {
      // Changement de role ou de statut : toutes les sessions de la personne sont revoquees.
      const [user] = await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { ...data, tokenVersion: { increment: 1 } }, select: userSelect }),
        prisma.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
      ]);
      return user;
    }
    return await prisma.user.update({ where: { id }, data, select: userSelect });
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
}