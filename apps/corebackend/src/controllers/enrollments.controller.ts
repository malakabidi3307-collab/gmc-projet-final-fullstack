import type { Request, RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import type { AuthUser } from "../middlewares/authenticate.js";
import * as enrollmentsService from "../services/enrollments.service.js";
import {
  createEnrollmentSchema,
  listEnrollmentsQuerySchema,
  updateEnrollmentSchema,
} from "../validators/enrollments.validators.js";

function actorOf(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
  }
  return req.user;
}

export const list: RequestHandler = async (req, res) => {
  const query = listEnrollmentsQuerySchema.parse(req.query);
  res.status(200).json(await enrollmentsService.listEnrollments(actorOf(req), query));
};

export const getOne: RequestHandler = async (req, res) => {
  res.status(200).json({ enrollment: await enrollmentsService.getEnrollment(actorOf(req), String(req.params.id)) });
};

export const create: RequestHandler = async (req, res) => {
  const input = createEnrollmentSchema.parse(req.body);
  res.status(201).json({ enrollment: await enrollmentsService.createEnrollment(input) });
};

export const update: RequestHandler = async (req, res) => {
  const input = updateEnrollmentSchema.parse(req.body);
  res.status(200).json({ enrollment: await enrollmentsService.updateEnrollment(String(req.params.id), input) });
};

export const cancel: RequestHandler = async (req, res) => {
  res.status(200).json({ enrollment: await enrollmentsService.cancelEnrollment(actorOf(req), String(req.params.id)) });
};