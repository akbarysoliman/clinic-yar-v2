import { Router } from "express";
import {
  listOffices,
  getOffice,
  createOffice,
  updateOffice,
  deleteOffice,
  activateOffice,
  deactivateOffice,
  assignOfficeToBranch,
  removeOfficeFromBranch,
  assignDoctorToOffice,
  removeDoctorFromOffice,
} from "../controllers/offices.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listOffices));
router.get("/:id", asyncHandler(getOffice));
router.post("/", requireRole("super_admin", "branch_admin"), asyncHandler(createOffice));
router.put("/:id", requireRole("super_admin", "branch_admin"), asyncHandler(updateOffice));
router.patch("/:id/activate", requireRole("super_admin", "branch_admin"), asyncHandler(activateOffice));
router.patch("/:id/deactivate", requireRole("super_admin", "branch_admin"), asyncHandler(deactivateOffice));
router.delete("/:id", requireRole("super_admin", "branch_admin"), asyncHandler(deleteOffice));

// اختصاص مطب به شعبه
router.post("/:id/branches", requireRole("super_admin", "branch_admin"), asyncHandler(assignOfficeToBranch));
router.delete("/:id/branches/:branchId", requireRole("super_admin", "branch_admin"), asyncHandler(removeOfficeFromBranch));

// اختصاص پزشک به مطب
router.post("/:id/doctors", requireRole("super_admin", "branch_admin"), asyncHandler(assignDoctorToOffice));
router.delete("/:id/doctors/:doctorId", requireRole("super_admin", "branch_admin"), asyncHandler(removeDoctorFromOffice));

export default router;