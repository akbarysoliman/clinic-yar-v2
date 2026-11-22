import { Router } from "express";
import { searchPatients, createPatient, getPatient, listPatients, updatePatient } from "../controllers/patients.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { loadLicenseEntitlements } from "../middleware/licenseEntitlements.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.use(loadLicenseEntitlements);

router.get("/", asyncHandler(listPatients));
// جستجوی هویتی (نام/تلفن) برای همه نقش‌ها لازم است — نوبت‌دهی و تسویه‌حساب به آن نیاز دارند.
router.get("/search", asyncHandler(searchPatients));
router.post("/", asyncHandler(createPatient));
// اطلاعات پزشکی کامل (تشخیص، نسخه‌ها) فقط برای پزشک و مدیر — منشی/حسابدار نباید ببینند.
router.get("/:id", requireRole("doctor", "secretary", "accountant", "branch_admin", "super_admin"), asyncHandler(getPatient));
router.put("/:id", asyncHandler(updatePatient));
export default router;