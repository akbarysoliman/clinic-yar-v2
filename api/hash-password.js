import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function hashAndUpdate() {
  const phone = '09120000001';
  const plainPassword = '1234@1234#';

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE phone = $2',
      [hashedPassword, phone]
    );

    if (result.rowCount > 0) {
      console.log(`✅ رمز عبور برای شماره ${phone} با موفقیت به‌روزرسانی شد!`);
      console.log(`🟢 رمز جدید: ${plainPassword}`);
    } else {
      console.log(`❌ شماره ${phone} در دیتابیس پیدا نشد.`);
    }
  } catch (err) {
    console.error('❌ خطا:', err);
  } finally {
    await pool.end();
  }
}

hashAndUpdate();