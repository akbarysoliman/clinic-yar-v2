import { Router } from "express";
import {
  requirePatient,
  listPotentialRecords,
  requestLink,
  listMyRecords,
  listPendingLinks,
  approveLink,
  rejectLink,
  listMyAppointments,
  requestAppointment,
  getDoctorSlots,
  getDoctorDays,
  listPatientDoctors,
  getMyProfile,
  updateMyProfile,
listMyInvoices,
listMyPrescriptions,
} from "../controllers/patientPortal.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

// routes بیمار (فقط role === "patient")
router.get("/potential-records", requirePatient, asyncHandler(listPotentialRecords));
router.post("/request-link", requirePatient, asyncHandler(requestLink));
router.get("/my-records", requirePatient, asyncHandler(listMyRecords));
router.get("/my-appointments", requirePatient, asyncHandler(listMyAppointments));
router.post("/request-appointment", requirePatient, asyncHandler(requestAppointment));
router.get("/doctor-slots", requirePatient, asyncHandler(getDoctorSlots));
router.get("/doctor-days", requirePatient, asyncHandler(getDoctorDays));
router.get("/doctors", requirePatient, asyncHandler(listPatientDoctors));
router.get("/my-profile", requirePatient, asyncHandler(getMyProfile));
router.put("/my-profile", requirePatient, asyncHandler(updateMyProfile));
router.get("/my-prescriptions", requirePatient, asyncHandler(listMyPrescriptions));
router.get("/my-invoices", requirePatient, asyncHandler(listMyInvoices));
// routes منشی/مدیر (تأیید/رد درخواست‌ها)
router.get(
  "/pending-links",
  requireRole("secretary", "branch_admin", "super_admin"),
  asyncHandler(listPendingLinks)
);
router.patch(
  "/links/:id/approve",
  requireRole("secretary", "branch_admin", "super_admin"),
  asyncHandler(approveLink)
);
router.delete(
  "/links/:id",
  requireRole("secretary", "branch_admin", "super_admin"),
  asyncHandler(rejectLink)
);

export default router;