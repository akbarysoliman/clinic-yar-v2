import { Router } from "express";
import { quickCheckout, listInvoices, getInvoice, financeSummary } from "../controllers/invoices.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(listInvoices));
router.get("/summary", asyncHandler(financeSummary));
router.post("/quick-checkout", asyncHandler(quickCheckout));
router.get("/:id", asyncHandler(getInvoice));

export default router;
