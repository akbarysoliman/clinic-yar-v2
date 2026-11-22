import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function run() {
  console.log("⚠️  این اسکریپت فقط برای تست/دمو است و کل داده‌های فعلی دیتابیس را برای همیشه پاک می‌کند.");
  console.log("⚠️  اگر روی دیتابیسی با داده واقعیِ بیمار اجرا کنید، همه آن داده از بین می‌رود.");
  const answer = await ask('برای تأیید و ادامه، دقیقاً بنویسید "RESET" و Enter بزنید: ');
  if (answer.trim() !== "RESET") {
    console.log("لغو شد. هیچ تغییری اعمال نشد.");
    process.exit(0);
  }

  console.log("\nدر حال پاک‌سازی کامل دیتابیس قبلی ...");
  await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);

  console.log("در حال اجرای schema.sql ...");
  const schemaPath = path.join(__dirname, "../../database/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(schemaSql);

  console.log("در حال ساخت داده‌های نمونه ...");

  const branch = await pool.query(
    `INSERT INTO branches (name, address, phone) VALUES ($1, $2, $3) RETURNING id`,
    ["شعبه ولیعصر", "تهران، خیابان ولیعصر", "021-88880000"]
  );
  const branchId = branch.rows[0].id;

  const specialty = await pool.query(
    `INSERT INTO specialties (name) VALUES ($1) RETURNING id`,
    ["پوست و مو"]
  );

  const passwordHash = await bcrypt.hash("Passw0rd!", 10);

  const admin = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, branch_id)
     VALUES ($1, $2, $3, 'super_admin', NULL) RETURNING id`,
    ["مدیر کل", "09120000001", passwordHash]
  );

  const secretary = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, branch_id)
     VALUES ($1, $2, $3, 'secretary', $4) RETURNING id`,
    ["زهرا منشی", "09120000002", passwordHash, branchId]
  );

  const doctorUser = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, branch_id)
     VALUES ($1, $2, $3, 'doctor', $4) RETURNING id`,
    ["دکتر سارا محمدی", "09120000003", passwordHash, branchId]
  );

  const doctor = await pool.query(
    `INSERT INTO doctors (user_id, specialty_id) VALUES ($1, $2) RETURNING id`,
    [doctorUser.rows[0].id, specialty.rows[0].id]
  );

  await pool.query(
    `INSERT INTO doctor_branches (doctor_id, branch_id) VALUES ($1, $2)`,
    [doctor.rows[0].id, branchId]
  );

  for (let weekday = 0; weekday <= 6; weekday++) {
    await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, branch_id, weekday, start_time, end_time, slot_minutes)
       VALUES ($1, $2, $3, '09:00', '19:00', 30)`,
      [doctor.rows[0].id, branchId, weekday]
    );
  }

  console.log("در حال ساخت شعبه دوم برای تست چندشعبه‌ای ...");

  const branch2 = await pool.query(
    `INSERT INTO branches (name, address, phone) VALUES ($1, $2, $3) RETURNING id`,
    ["شعبه سعادت‌آباد", "تهران، سعادت‌آباد", "021-88881111"]
  );
  const branch2Id = branch2.rows[0].id;

  const specialty2 = await pool.query(
    `INSERT INTO specialties (name) VALUES ($1) RETURNING id`,
    ["اطفال"]
  );

  const secretary2 = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, branch_id)
     VALUES ($1, $2, $3, 'secretary', $4) RETURNING id`,
    ["مریم منشی", "09120000004", passwordHash, branch2Id]
  );

  const doctorUser2 = await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, branch_id)
     VALUES ($1, $2, $3, 'doctor', $4) RETURNING id`,
    ["دکتر نگار احمدی", "09120000005", passwordHash, branch2Id]
  );

  const doctor2 = await pool.query(
    `INSERT INTO doctors (user_id, specialty_id) VALUES ($1, $2) RETURNING id`,
    [doctorUser2.rows[0].id, specialty2.rows[0].id]
  );

  await pool.query(
    `INSERT INTO doctor_branches (doctor_id, branch_id) VALUES ($1, $2)`,
    [doctor2.rows[0].id, branch2Id]
  );

  for (let weekday = 0; weekday <= 6; weekday++) {
    await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, branch_id, weekday, start_time, end_time, slot_minutes)
       VALUES ($1, $2, $3, '09:00', '17:00', 30)`,
      [doctor2.rows[0].id, branch2Id, weekday]
    );
  }

  console.log("✓ داده‌های نمونه ساخته شد.");
  console.log("");
  console.log("می‌توانید با این حساب‌ها وارد شوید (رمز همه: Passw0rd!):");
  console.log("  مدیر کل (همه شعبه‌ها) → 09120000001");
  console.log("  منشی شعبه ولیعصر      → 09120000002");
  console.log("  پزشک شعبه ولیعصر      → 09120000003");
  console.log("  منشی شعبه سعادت‌آباد  → 09120000004");
  console.log("  پزشک شعبه سعادت‌آباد  → 09120000005");

  await pool.end();
}

run().catch((err) => {
  console.error("خطا در اجرای seed:", err);
  process.exit(1);
});
