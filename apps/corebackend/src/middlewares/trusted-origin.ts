import type { RequestHandler } from "express";
import { isAllowedOrigin } from "../config/clients.js";
import { AppError } from "../errors/app-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Protection CSRF : toute requete qui modifie des donnees doit venir d'une de nos deux applications.
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  if (!isAllowedOrigin(req.headers.origin)) {
    next(new AppError(403, "ORIGIN_NOT_ALLOWED", "Origine de la requete non autorisee."));
    return;
  }
  next();
};