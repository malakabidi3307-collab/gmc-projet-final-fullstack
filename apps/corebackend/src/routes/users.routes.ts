import { Router } from "express";
import { create, getOne, list, update } from "../controllers/users.controller.js";
import { authenticate, requireRole } from "../middlewares/authenticate.js";

const router = Router();

// Tout le domaine "utilisateurs" est reserve aux administrateurs.
router.use(authenticate, requireRole("ADMIN"));

router.get("/", list);
router.post("/", create);
router.get("/:id", getOne);
router.patch("/:id", update);

export default router;