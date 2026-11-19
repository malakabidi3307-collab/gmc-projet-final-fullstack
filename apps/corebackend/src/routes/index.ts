import { Router } from "express";
import { requireTrustedOrigin } from "../middlewares/trusted-origin.js";
import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import coursesRoutes from "./courses.routes.js";
import enrollmentsRoutes from "./enrollments.routes.js";
import healthRoutes from "./health.routes.js";
import sessionsRoutes from "./sessions.routes.js";
import usersRoutes from "./users.routes.js";

const router = Router();

router.use(requireTrustedOrigin);
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/courses", coursesRoutes);
router.use("/training-sessions", sessionsRoutes);
router.use("/enrollments", enrollmentsRoutes);
router.use("/admin", adminRoutes);

export default router;