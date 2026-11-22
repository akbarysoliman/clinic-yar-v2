import { Router } from "express";
import {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  listPendingAppointments,
  reviewAppointment,
} from "../controllers/appointments.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { rescheduleAppointment } from "../controllers/appointments.controller.js";
import { bulkRescheduleAppointments } from "../controllers/appointments.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listAppointments));
router.post("/", asyncHandler(createAppointment));
router.patch("/:id/status", asyncHandler(updateAppointmentStatus));
router.patch("/bulk-reschedule", requireAuth, requireRole("super_admin", "branch_admin", "secretary"), asyncHandler(bulkRescheduleAppointments));
router.patch("/:id/reschedule", requireAuth, requireRole("super_admin", "branch_admin", "secretary"), asyncHandler(rescheduleAppointment));

// درخواست‌های نوبت (برای منشی/مدیر)
router.get(
  "/pending",
  requireRole("secretary", "accountant", "branch_admin", "super_admin"),
  asyncHandler(listPendingAppointments)
);

router.patch(
  "/:id/review",
  requireRole("secretary", "accountant", "branch_admin", "super_admin"),
  asyncHandler(reviewAppointment)
);

export default router;