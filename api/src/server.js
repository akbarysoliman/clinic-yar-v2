import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { checkLicense } from "./middleware/checkLicense.js";
import { requireAuth } from "./middleware/auth.js";
import { loadLicenseEntitlements } from "./middleware/licenseEntitlements.js";
import officesRouter from "./routes/offices.routes.js";
import backupRoutes from "./routes/backup.routes.js";
import patientPortalRoutes from "./routes/patientPortal.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import authRoutes from "./routes/auth.routes.js";
import branchesRoutes from "./routes/branches.routes.js";
import patientsRoutes from "./routes/patients.routes.js";
import doctorsRoutes from "./routes/doctors.routes.js";
import appointmentsRoutes from "./routes/appointments.routes.js";
import visitsRoutes from "./routes/visits.routes.js";
import invoicesRoutes from "./routes/invoices.routes.js";
import usersRoutes from "./routes/users.routes.js";
import specialtiesRoutes from "./routes/specialties.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import healthRoutes from "./routes/health.routes.js";
dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-this-to-a-long-random-string") {
  console.error("✗ JWT_SECRET تنظیم نشده یا هنوز مقدار نمونه‌ی .env.example است.");
  console.error("  یک رشته تصادفی و طولانی برای JWT_SECRET در فایل .env بگذارید و دوباره اجرا کنید.");
  console.error('  مثال ساخت سریع: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();

// ✅ CORS - با استفاده از متغیر محیطی
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : [
      "https://clinic-app-2026.netlify.app",
      "http://localhost:5173",
      "http://localhost:5176"
    ];

app.use(cors({
  origin: (origin, callback) => {
    // اجازه دادن به درخواست‌های بدون origin (مثل Postman یا curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS: این دامنه مجاز نیست"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/api/offices", officesRouter);
app.use("/api/backup", backupRoutes);
app.use("/api/patient-portal", patientPortalRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/health", healthRoutes);
// ============================================================
// ✅ اعتبارسنجی لایسنس - قبل از همه مسیرها (به جز /api/auth)
// ============================================================
app.use(checkLicense);

// ============================================================
// مسیرهای عمومی (بدون نیاز به لایسنس)
// ============================================================
app.get(
  "/api/license/status",
  requireAuth,
  loadLicenseEntitlements,
  (req, res) => {
    const lic = req.license?.license || {};
    const valid = req.license?.valid !== false;

    res.json({
      success: true,
      license: {
        active: valid,
        key: lic.key || null,
        expiry: lic.expiry_date || null,
        days_left: lic.days_left || null,
        installation_id: lic.installation_id || null,
        device_lock_enabled: lic.device_lock_enabled || false,
        max_installations: lic.max_installations || null,
        entitlements: lic.entitlements || {},
        server_time: req.license?.server_time || null,
      },
    });
  }
);
// ============================================================
// مسیرهای API
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api/branches", branchesRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/visits", visitsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/specialties", specialtiesRoutes);
app.use("/api/dashboard", dashboardRoutes);
// ============================================================
// مدیریت متمرکز خطاها
// ============================================================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "خطای داخلی سرور" });
});

// ============================================================
// راه‌اندازی سرور
// ============================================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✓ API کلینیک‌یار روی پورت ${PORT} اجرا شد`);
  console.log(`✓ CORS مجاز: ${process.env.CORS_ORIGIN || "https://clinic-app-2026.netlify.app"}`);
  console.log(`✓ هسته مرکزی: ${process.env.CORE_API_URL || "http://localhost/public_html/api"}`);
});