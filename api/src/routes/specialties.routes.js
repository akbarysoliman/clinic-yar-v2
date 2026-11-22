import { Router } from "express";
import { listSpecialties, createSpecialty } from "../controllers/specialties.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(listSpecialties));
router.post("/", requireRole("super_admin", "branch_admin"), asyncHandler(createSpecialty));

export default router;
