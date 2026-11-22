import pg from 'pg';
const { Pool } = pg;

// اطلاعات دیتابیس از محیط (Environment Variables) خوانده می‌شود
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
});

async function updateDB() {
  try {
    console.log("🔄 در حال اعمال تغییرات روی دیتابیس...");
    
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'secretary';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_id INT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INT;`);
    
    console.log("✅ دیتابیس با موفقیت به‌روزرسانی شد!");
  } catch (err) {
    console.error("❌ خطا در اجرای دستورات:", err);
  } finally {
    await pool.end(); // بستن اتصال دیتابیس
    process.exit();
  }
}

updateDB();