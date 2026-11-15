import type { Request, RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import type { AuthUser } from "../middlewares/authenticate.js";
import * as coursesService from "../services/courses.service.js";
import { createCourseSchema, listCoursesQuerySchema, updateCourseSchema } from "../validators/courses.validators.js";

function actorOf(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
  }
  return req.user;
}

export const list: RequestHandler = async (req, res) => {
  const query = listCoursesQuerySchema.parse(req.query);
  res.status(200).json(await coursesService.listCourses(actorOf(req), query));
};

export const getOne: RequestHandler = async (req, res) => {
  res.status(200).json({ course: await coursesService.getCourse(actorOf(req), String(req.params.id)) });
};

export const create: RequestHandler = async (req, res) => {
  const input = createCourseSchema.parse(req.body);
  res.status(201).json({ course: await coursesService.createCourse(actorOf(req), input) });
};

export const update: RequestHandler = async (req, res) => {
  const input = updateCourseSchema.parse(req.body);
  res.status(200).json({ course: await coursesService.updateCourse(actorOf(req), String(req.params.id), input) });
};

export const remove: RequestHandler = async (req, res) => {
  await coursesService.deleteCourse(String(req.params.id));
  res.status(204).end();
};