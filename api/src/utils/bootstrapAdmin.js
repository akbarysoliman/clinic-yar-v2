import readline from "readline";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

/**
 * این اسکریپت هیچ داده‌ای را پاک نمی‌کند؛ فقط یک شعبه و یک حساب مدیر کل واقعی می‌سازد.
 * برای راه‌اندازی اولیه روی داده واقعی (نه تست) استفاده کنید.
 */
async function run() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("=== راه‌اندازی اولیه کلینیک‌یار (محیط واقعی) ===\n");

  const branchName = await ask(rl, "نام شعبه اول (مثلاً «کلینیک دی» یا «شعبه ولیعصر»): ");
  const branchAddress = await ask(rl, "آدرس شعبه (اختیاری، Enter برای رد کردن): ");
  const branchPhone = await ask(rl, "تلفن شعبه (اختیاری، Enter برای رد کردن): ");

  const adminName = await ask(rl, "\nنام و نام‌خانوادگی مدیر کل: ");
  const adminPhone = await ask(rl, "شماره تماس مدیر کل (برای ورود استفاده می‌شود): ");
  const adminPassword = await ask(rl, "رمز عبور مدیر کل (حداقل ۸ کاراکتر): ");

  rl.close();

  if (!branchName || !adminName || !adminPhone || !adminPassword || adminPassword.length < 8) {
    console.error("\n✗ ورودی ناقص یا رمز عبور کوتاه‌تر از ۸ کاراکتر است. دوباره تلاش کنید.");
    process.exit(1);
  }

  const existing = await pool.query(`SELECT id FROM users WHERE phone = $1`, [adminPhone]);
  if (existing.rows.length > 0) {
    console.error("\n✗ کاربری با این شماره تماس از قبل وجود دارد.");
    await pool.end();
    process.exit(1);
  }

  const branch = await pool.query(
    `INSERT INTO branches (name, address, phone) VALUES ($1, $2, $3) RETURNING id, name`,
    [branchName, branchAddress || null, branchPhone || null]
  );

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await pool.query(
    `INSERT INTO users (full_name, phone, password_hash, role, branch_id)
     VALUES ($1, $2, $3, 'super_admin', NULL)`,
    [adminName, adminPhone, passwordHash]
  );

  console.log(`\n✓ شعبه «${branch.rows[0].name}» و حساب مدیر کل ساخته شد.`);
  console.log("می‌توانید همین حالا با همین شماره و رمز وارد شوید و بقیه کاربران (پزشک، منشی) را از بخش «تنظیمات» اضافه کنید.");

  await pool.end();
}

run().catch((err) => {
  console.error("خطا:", err);
  process.exit(1);
});
