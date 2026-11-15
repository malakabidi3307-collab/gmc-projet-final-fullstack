import { Router } from "express";
import { requireTrustedOrigin } from "../middlewares/trusted-origin.js";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";

const router = Router();

router.use(requireTrustedOrigin);
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

export default router;