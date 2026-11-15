import { Router } from "express";
import { create, getOne, list, remove, update } from "../controllers/courses.controller.js";
import { authenticate, requireRole } from "../middlewares/authenticate.js";

const router = Router();

router.use(authenticate);

// Lecture : tous les roles connectes, avec un perimetre filtre par le service.
router.get("/", list);
router.get("/:id", getOne);

// Ecriture : administrateurs uniquement.
router.post("/", requireRole("ADMIN"), create);
router.patch("/:id", requireRole("ADMIN"), update);
router.delete("/:id", requireRole("ADMIN"), remove);

export default router;