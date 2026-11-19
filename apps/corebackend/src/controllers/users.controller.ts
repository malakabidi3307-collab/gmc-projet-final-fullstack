import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import * as usersService from "../services/users.service.js";
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from "../validators/users.validators.js";

export const list: RequestHandler = async (req, res) => {
  const query = listUsersQuerySchema.parse(req.query);
  res.status(200).json(await usersService.listUsers(query));
};

export const getOne: RequestHandler = async (req, res) => {
  res.status(200).json({ user: await usersService.getUser(String(req.params.id)) });
};

export const create: RequestHandler = async (req, res) => {
  const input = createUserSchema.parse(req.body);
  res.status(201).json({ user: await usersService.createUser(input) });
};

export const update: RequestHandler = async (req, res) => {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentification requise.");
  }
  const input = updateUserSchema.parse(req.body);
  res.status(200).json({ user: await usersService.updateUser(req.user, String(req.params.id), input) });
};