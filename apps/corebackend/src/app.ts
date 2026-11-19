import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import routes from "./routes/index.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}