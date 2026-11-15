import { Router } from "express";
import { requireTrustedOrigin } from "../middlewares/trusted-origin.js";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import usersRoutes from "./users.routes.js";

const router = Router();

router.use(requireTrustedOrigin);
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);

export default router;