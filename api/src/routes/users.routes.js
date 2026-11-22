import { Router } from "express";
import {
  listUsers,
  createUser,
  deactivateUser,
  activateUser,
  updateUser,
  deleteUser,
} from "../controllers/users.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { loadLicenseEntitlements } from "../middleware/licenseEntitlements.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listUsers));
router.post("/", loadLicenseEntitlements, requireRole("super_admin", "branch_admin"), asyncHandler(createUser));
router.put("/:id", requireRole("super_admin", "branch_admin"), asyncHandler(updateUser));
router.patch("/:id/deactivate", requireRole("super_admin", "branch_admin"), asyncHandler(deactivateUser));
router.patch("/:id/activate", requireRole("super_admin", "branch_admin"), asyncHandler(activateUser));
router.delete("/:id", requireRole("super_admin", "branch_admin"), asyncHandler(deleteUser));

export default router;