import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
 max: 5,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 30000, // فرصت کافی برای «بیدار شدن» دیتابیس‌های serverless مثل Neon
});

pool.on("error", (err) => {
  console.error("خطای غیرمنتظره در استخر اتصال دیتابیس:", err.message);
});

function isTransientConnectionError(err) {
return /Connection terminated unexpectedly|Connection terminated due to connection timeout|ECONNRESET|terminating connection/i.test(err.message || "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * اجرای یک کوئری با پارامتر — تابع کمکی برای جلوگیری از تکرار try/catch.
 * روی دیتابیس‌های serverless (مثل Neon) که بعد از بی‌کاری خودکار خاموش می‌شوند،
 * اولین درخواست ممکن است هنگام «بیدار شدن» با قطعی موقت مواجه شود؛
 * این تابع در آن حالت خودکار تا ۲ بار دوباره تلاش می‌کند.
 */
export async function query(text, params, attempt = 0) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (isTransientConnectionError(err) && attempt < 2) {
      await sleep(500 * (attempt + 1));
      return query(text, params, attempt + 1);
    }
    throw err;
  }
}

/**
 * اجرای یک تراکنش با retry خودکار روی قطعی موقتِ ناشی از بیدارشدن دیتابیس serverless.
 * fn یک تابع async است که یک client می‌گیرد و باید BEGIN/COMMIT را خودش مدیریت کند؛
 * در صورت خطای اتصال گذرا، کل تراکنش (نه فقط یک کوئری) از نو تلاش می‌شود.
 */
export async function withTransaction(fn, attempt = 0) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* اتصال احتمالاً از قبل قطع شده */ }
    if (isTransientConnectionError(err) && attempt < 2) {
      client.release(true); // اتصال خراب را دور بریز، نه به pool برگردان
      await sleep(500 * (attempt + 1));
      return withTransaction(fn, attempt + 1);
    }
    throw err;
  } finally {
    try { client.release(); } catch { /* در حالت retry از قبل release(true) شده */ }
  }
}
