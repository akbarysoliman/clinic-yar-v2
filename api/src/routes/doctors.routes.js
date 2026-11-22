import { Router } from "express";
import {
  listDoctors,
  getDoctorById,
  doctorSchedule,
  setDoctorSchedule,
  myDoctorProfile,
  updateDoctor,
  deleteDoctor,
  activateDoctor,
  deactivateDoctor,
} from "../controllers/doctors.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { loadLicenseEntitlements } from "../middleware/licenseEntitlements.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(myDoctorProfile));
router.get("/", asyncHandler(listDoctors));
router.get("/:id", asyncHandler(getDoctorById));          // ← جدید
router.get("/:id/schedule", asyncHandler(doctorSchedule));
router.post("/:id/schedule", asyncHandler(setDoctorSchedule));

// ویرایش و حذف پزشک (نیاز به لایسنس)
router.put("/:id", loadLicenseEntitlements, requireRole("super_admin", "branch_admin"), asyncHandler(updateDoctor));
router.patch("/:id/activate", requireRole("super_admin", "branch_admin"), asyncHandler(activateDoctor));
router.patch("/:id/deactivate", requireRole("super_admin", "branch_admin"), asyncHandler(deactivateDoctor));
router.delete("/:id", loadLicenseEntitlements, requireRole("super_admin", "branch_admin"), asyncHandler(deleteDoctor));

export default router;