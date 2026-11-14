import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

function bodyParserErrorType(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "type" in err) {
    const type = (err as { type?: unknown }).type;
    return typeof type === "string" ? type : undefined;
  }
  return undefined;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Ressource introuvable." } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Donnees invalides.",
        details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }
  const bodyType = bodyParserErrorType(err);
  if (bodyType === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Corps de requete JSON invalide." } });
    return;
  }
  if (bodyType === "entity.too.large") {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Corps de requete trop volumineux." } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne du serveur." } });
};