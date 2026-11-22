import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const PG_DUMP_PATH = "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe";

/**
 * دانلود بکاپ دیتابیس (PostgreSQL)
 * فقط برای super_admin
 */
export async function downloadBackup(req, res) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: "DATABASE_URL تنظیم نشده است" });
    }

    // ساخت نام فایل با تاریخ و ساعت
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `clinicyar_backup_${timestamp}.sql`;
    const tmpPath = path.join(os.tmpdir(), filename);

    // اجرای pg_dump
    const command = `"${PG_DUMP_PATH}" "${dbUrl}" -f "${tmpPath}"`;

    await execAsync(command, { maxBuffer: 1024 * 1024 * 100 }); // 100MB buffer

    // بررسی وجود فایل
    if (!fs.existsSync(tmpPath)) {
      return res.status(500).json({ error: "فایل بکاپ ساخته نشد" });
    }

    // ارسال فایل به کاربر
    res.download(tmpPath, filename, (err) => {
      // پاک کردن فایل موقت بعد از دانلود
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
      if (err) {
        console.error("خطا در ارسال فایل بکاپ:", err);
      }
    });
  } catch (error) {
    console.error("خطا در ساخت بکاپ:", error);
    return res.status(500).json({
      error: "خطا در ساخت بکاپ دیتابیس",
      details: error.message,
    });
  }
}

/**
 * اطلاعات بکاپ (آخرین بکاپ‌ها)
 */
export async function getBackupInfo(req, res) {
  try {
    const now = new Date();
    res.json({
      available: true,
      pg_dump_path: PG_DUMP_PATH,
      pg_dump_exists: fs.existsSync(PG_DUMP_PATH),
      server_time: now.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function restoreBackup(req, res) {
  try {
    const { file_base64 } = req.body;
    
    if (!file_base64) {
      return res.status(400).json({ error: "فایل بکاپ ارسال نشده است" });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: "تنظیمات دیتابیس یافت نشد" });
    }

    // ۱. تبدیل Base64 به فایل موقت
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    
    const fileName = `restore_${Date.now()}.sql`;
    const filePath = path.join(tempDir, fileName);
    
    fs.writeFileSync(filePath, Buffer.from(file_base64, 'base64'));

    // ۲. پاک کردن Schema فعلی
    console.log("Dropping current schema...");
    const dropCommand = `psql "${dbUrl}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`;
    await execAsync(dropCommand);

    // ۳. بازیابی از فایل بکاپ
    console.log("Restoring from backup file...");
    const restoreCommand = `psql "${dbUrl}" -f "${filePath}"`;
    await execAsync(restoreCommand);

    // ۴. ⭐ اصلاح خودکار Sequence ها (حل ریشه‌ای مشکل)
    console.log("Fixing sequences...");
    const fixSequencesCommand = `psql "${dbUrl}" -c "
      DO \\$\\$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT c.relname AS seq_name, t.relname AS table_name, a.attname AS column_name
          FROM pg_class c
          JOIN pg_depend d ON d.objid = c.oid
          JOIN pg_class t ON d.refobjid = t.oid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
          WHERE c.relkind = 'S' AND t.relkind = 'r'
        LOOP
          EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))', 
            r.seq_name, r.column_name, r.table_name);
        END LOOP;
      END \\$\\$;
    "`;
    await execAsync(fixSequencesCommand);

    // ۵. پاک کردن فایل موقت
    fs.unlinkSync(filePath);

    res.json({ 
      success: true, 
      message: "بازیابی با موفقیت انجام شد. لطفاً صفحه را رفرش کنید." 
    });
  } catch (err) {
    console.error("restoreBackup error:", err);
    res.status(500).json({ error: "خطا در بازیابی بکاپ: " + err.message });
  }
}