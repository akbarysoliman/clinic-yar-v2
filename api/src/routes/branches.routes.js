import { Router } from "express";
import {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  activateBranch,
  deactivateBranch,
} from "../controllers/branches.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { loadLicenseEntitlements } from "../middleware/licenseEntitlements.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.use(loadLicenseEntitlements);

router.get("/", asyncHandler(listBranches));
router.post("/", requireRole("super_admin"), asyncHandler(createBranch));
router.put("/:id", requireRole("super_admin"), asyncHandler(updateBranch));
router.patch("/:id/activate", requireRole("super_admin"), asyncHandler(activateBranch));
router.patch("/:id/deactivate", requireRole("super_admin"), asyncHandler(deactivateBranch));
router.delete("/:id", requireRole("super_admin"), asyncHandler(deleteBranch));

export default router;