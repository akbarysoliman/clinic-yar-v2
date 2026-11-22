import { Router } from "express";
import { createVisit, getVisit } from "../controllers/visits.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.post("/", requireRole("doctor"), asyncHandler(createVisit));
router.get("/:id", asyncHandler(getVisit));

export default router;
