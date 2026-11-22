import { Router } from "express";
import { downloadBackup, getBackupInfo } from "../controllers/backup.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { restoreBackup } from "../controllers/backup.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/info", requireRole("super_admin"), asyncHandler(getBackupInfo));
router.get("/download", requireRole("super_admin"), asyncHandler(downloadBackup));
router.post("/restore", requireRole("super_admin"), asyncHandler(restoreBackup));
export default router;