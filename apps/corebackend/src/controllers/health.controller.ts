import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

export const getHealth: RequestHandler = (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "IFAG backend is running",
    timestamp: new Date().toISOString(),
  });
};

export const getDatabaseHealth: RequestHandler = async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new AppError(503, "DATABASE_UNAVAILABLE", "Base de donnees indisponible.");
  }
  res.status(200).json({ status: "ok", database: "up" });
};