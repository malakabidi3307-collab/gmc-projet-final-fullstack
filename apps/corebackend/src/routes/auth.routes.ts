import { Router } from "express";
import { changePassword, login, logout, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.post("/change-password", authenticate, changePassword);

export default router;