import { Router } from "express";
import { get } from "../controllers/dashboard.controller.js";
import { authenticate, requireRole } from "../middlewares/authenticate.js";

const router = Router();

// Tout le routeur est reserve aux administrateurs.
router.use(authenticate, requireRole("ADMIN"));
router.get("/dashboard", get);

export default router;