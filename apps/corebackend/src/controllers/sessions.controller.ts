import type { Request, RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import type { AuthUser } from "../middlewares/authenticate.js";
import * as sessionsService from "../services/sessions.service.js";
import { createSessionSchema, listSessionsQuerySchema, updateSessionSchema } from "../validators/sessions.validators.js";

function actorOf(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
  }
  return req.user;
}

export const list: RequestHandler = async (req, res) => {
  const query = listSessionsQuerySchema.parse(req.query);
  res.status(200).json(await sessionsService.listSessions(actorOf(req), query));
};

export const getOne: RequestHandler = async (req, res) => {
  res.status(200).json({ session: await sessionsService.getSession(actorOf(req), String(req.params.id)) });
};

export const create: RequestHandler = async (req, res) => {
  const input = createSessionSchema.parse(req.body);
  res.status(201).json({ session: await sessionsService.createSession(input) });
};

export const update: RequestHandler = async (req, res) => {
  const input = updateSessionSchema.parse(req.body);
  res.status(200).json({ session: await sessionsService.updateSession(String(req.params.id), input) });
};

export const remove: RequestHandler = async (req, res) => {
  await sessionsService.deleteSession(String(req.params.id));
  res.status(204).end();
};