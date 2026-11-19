import { Router } from "express";
import { cancel, create, getOne, list, update } from "../controllers/enrollments.controller.js";
import { authenticate, requireRole } from "../middlewares/authenticate.js";

const router = Router();

router.use(authenticate);

// Lecture : tous les roles connectes, avec un perimetre filtre par le service.
router.get("/", list);
router.get("/:id", getOne);

// Gestion : administrateurs uniquement.
router.post("/", requireRole("ADMIN"), create);
router.patch("/:id", requireRole("ADMIN"), update);

// Annulation : administrateur ou apprenant proprietaire (le role est verifie dans le service).
router.post("/:id/cancel", cancel);

export default router;