import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * برخلاف seedDemo.js، این اسکریپت هرگز داده‌ای را پاک نمی‌کند.
 * فقط اگر جدول‌ها هنوز وجود نداشتند، آن‌ها را می‌سازد.
 */
async function run() {
  const check = await pool.query(
    `SELECT to_regclass('public.branches') AS exists`
  );

  if (check.rows[0].exists) {
    console.log("جدول‌ها از قبل وجود دارند؛ کاری انجام نشد.");
  } else {
    console.log("در حال ساخت جدول‌ها از روی schema.sql ...");
    const schemaPath = path.join(__dirname, "../../database/schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await pool.query(schemaSql);
    console.log("✓ جدول‌ها ساخته شدند.");
  }

  // partial unique index برای جلوگیری از نوبت تکراری (فقط نوبت‌های فعال)
  console.log("در حال بررسی/ساخت partial unique index برای appointments ...");
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS appointments_doctor_time_active_uniq
    ON appointments (doctor_id, appointment_at)
    WHERE status NOT IN ('cancelled', 'no_show')
  `);
  console.log("✓ partial unique index آماده است.");
  // جدول حساب بیماران (برای احراز هویت)
  console.log("در حال بررسی/ساخت جداول patient_accounts و patient_links ...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_accounts (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) NOT NULL UNIQUE,
      full_name VARCHAR(150) NOT NULL,
      national_code VARCHAR(20),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_links (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES patient_accounts(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      clinic_id INTEGER NOT NULL REFERENCES clinics(id),
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_at TIMESTAMP WITH TIME ZONE,
      verified_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE (account_id, patient_id)
    )
  `);
  console.log("✓ جداول patient_accounts و patient_links آماده هستند.");
  // اضافه کردن وضعیت‌های pending و rejected به enum
  console.log("در حال بررسی enum appointment_status ...");
  await pool.query(`ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'pending'`);
  await pool.query(`ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'rejected'`);

  // اضافه کردن ستون booked_by_patient
  await pool.query(`
    ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS booked_by_patient INTEGER REFERENCES patient_accounts(id)
  `);

  // به‌روزرسانی UNIQUE INDEX (فقط نوبت‌های قطعی)
  await pool.query(`DROP INDEX IF EXISTS appointments_doctor_time_active_uniq`);
  await pool.query(`
    CREATE UNIQUE INDEX appointments_doctor_time_active_uniq
    ON appointments (doctor_id, appointment_at)
    WHERE status IN ('booked', 'checked_in', 'in_visit')
  `);
  console.log("✓ تغییرات appointments اعمال شدند.");

  await pool.end();
}

run().catch((err) => {
  console.error("خطا در اجرای migrate:", err);
  process.exit(1);
});