import { Router } from "express";
import { login, me, patientLogin, changePassword } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/patient-login", asyncHandler(patientLogin));

router.get("/me", requireAuth, asyncHandler(me));
router.put("/change-password", requireAuth, asyncHandler(changePassword));

export default router;