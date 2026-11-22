import { Router } from "express";
import { dashboardSummary } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", asyncHandler(dashboardSummary));

export default router;