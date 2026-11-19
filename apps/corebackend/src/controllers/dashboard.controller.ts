import type { RequestHandler } from "express";
import { getDashboard } from "../services/dashboard.service.js";

export const get: RequestHandler = async (_req, res) => {
  res.status(200).json(await getDashboard());
};