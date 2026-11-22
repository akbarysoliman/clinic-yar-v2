import { query, withTransaction } from "../db.js";
import { effectiveBranchId } from "../middleware/auth.js";

export async function listDoctors(req, res) {
  const clinicId = req.user?.clinic_id;
  const branchId = req.query.branch_id || effectiveBranchId(req);
  const search = (req.query.q || "").trim();

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const conditions = [`c.id = $1`];
  const params = [clinicId];

  if (branchId) {
    params.push(branchId);
    conditions.push(`db.branch_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR d.medical_code ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const { rows } = await query(
    `SELECT DISTINCT
       d.id,
       d.user_id,
       d.medical_code,
       d.specialty_id,
              u.full_name,
       u.username,
       u.phone,
       u.email,
       u.is_active,
       s.name AS specialty,
       db.branch_id,
       b.name AS branch_name,
       b.address AS branch_address,
       b.phone AS branch_phone,
       c.name AS clinic_name,
       c.id AS clinic_id
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN specialties s ON s.id = d.specialty_id
     JOIN doctor_branches db ON db.doctor_id = d.id
     JOIN branches b ON b.id = db.branch_id
     JOIN clinics c ON c.id = b.clinic_id
     ${where}
     ORDER BY u.full_name`,
    params
  );

  res.json({ doctors: rows });
}
export async function myDoctorProfile(req, res) {
  if (req.user.role !== "doctor") {
    return res.status(403).json({ error: "این مسیر فقط برای پزشکان است" });
  }
  const { rows } = await query(
    `SELECT d.id, d.medical_code, s.name AS specialty
     FROM doctors d
     LEFT JOIN specialties s ON s.id = d.specialty_id
     WHERE d.user_id = $1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "پروفایل پزشک یافت نشد" });
  res.json({ doctor: rows[0] });
}

export async function doctorSchedule(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  // بررسی این‌که پزشک مال همین کلینیک باشه
  const owns = await query(
    `SELECT d.id
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [id, clinicId]
  );
  if (owns.rows.length === 0) {
    return res.status(404).json({ error: "پزشک یافت نشد" });
  }

  const { rows } = await query(
    `SELECT weekday, start_time, end_time, slot_minutes, branch_id
     FROM doctor_schedules
     WHERE doctor_id = $1
     ORDER BY weekday`,
    [id]
  );
  res.json({ schedule: rows });
}
/**
 * جایگزینی کامل برنامه هفتگی یک پزشک برای یک شعبه مشخص.
 * body: { branch_id, blocks: [{ weekday, start_time, end_time, slot_minutes }] }
 * فقط مدیر (کل/شعبه) یا خودِ پزشک می‌تواند این را تغییر دهد.
 */
export async function setDoctorSchedule(req, res) {
  const { id } = req.params;
  const { branch_id, blocks } = req.body;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  if (!branch_id || !Array.isArray(blocks)) {
    return res.status(400).json({ error: "شعبه و فهرست بازه‌های زمانی الزامی است" });
  }

  for (const b of blocks) {
    if (b.weekday < 0 || b.weekday > 6 || !b.start_time || !b.end_time) {
      return res.status(400).json({ error: "هر بازه باید روز هفته (۰ تا ۶) و ساعت شروع/پایان معتبر داشته باشد" });
    }
    if (b.start_time >= b.end_time) {
      return res.status(400).json({ error: "ساعت شروع باید قبل از ساعت پایان باشد" });
    }
  }

  // ۱) بررسی این‌که پزشک مال همین کلینیک باشه
  const doctorCheck = await query(
    `SELECT d.id, d.user_id
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [id, clinicId]
  );
  if (doctorCheck.rows.length === 0) {
    return res.status(404).json({ error: "پزشک یافت نشد" });
  }

  // ۲) اگه پزشکه، فقط برنامه‌ی خودش رو می‌تونه تغییر بده
  if (req.user.role === "doctor" && doctorCheck.rows[0].user_id !== req.user.id) {
    return res.status(403).json({ error: "شما فقط می‌توانید برنامه خودتان را تغییر دهید" });
  }

  // ۳) بقیه نقش‌ها: فقط super_admin و branch_admin
  if (!["super_admin", "branch_admin", "doctor"].includes(req.user.role)) {
    return res.status(403).json({ error: "دسترسی غیرمجاز" });
  }

  // ۴) بررسی این‌که شعبه هم مال همین کلینیک باشه
  const branchCheck = await query(
    `SELECT id FROM branches WHERE id = $1 AND clinic_id = $2`,
    [branch_id, clinicId]
  );
  if (branchCheck.rows.length === 0) {
    return res.status(403).json({ error: "شعبه انتخابی به کلینیک شما تعلق ندارد" });
  }

  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM doctor_schedules WHERE doctor_id = $1 AND branch_id = $2`,
      [id, branch_id]
    );
    for (const b of blocks) {
      await client.query(
        `INSERT INTO doctor_schedules (doctor_id, branch_id, weekday, start_time, end_time, slot_minutes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, branch_id, b.weekday, b.start_time, b.end_time, b.slot_minutes || 30]
      );
    }
  });

  const { rows } = await query(
    `SELECT weekday, start_time, end_time, slot_minutes, branch_id
     FROM doctor_schedules
     WHERE doctor_id = $1
     ORDER BY weekday`,
    [id]
  );
  res.json({ schedule: rows });
}
/* ویرایش پزشک */
/* ویرایش پزشک */
export async function updateDoctor(req, res) {
  const { id } = req.params;
  const { full_name, username, phone, email, password, medical_code, specialty_id, branch_id } = req.body;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }
  if (!full_name) {
    return res.status(400).json({ error: "نام پزشک الزامی است" });
  }

  const doctorResult = await query(
    `SELECT d.user_id
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [id, clinicId]
  );
  if (doctorResult.rows.length === 0) {
    return res.status(404).json({ error: "پزشک یافت نشد" });
  }
  const userId = doctorResult.rows[0].user_id;

  // بررسی تکراری نبودن username
  if (username) {
    const dup = await query(
      `SELECT id FROM users WHERE username = $1 AND id != $2`,
      [username, userId]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: "این کد کاربری قبلاً استفاده شده است" });
    }
  }

  try {
    await withTransaction(async (client) => {
      // آپدیت کاربر
      if (password && password.length >= 8) {
        const bcrypt = (await import("bcryptjs")).default;
        const passwordHash = await bcrypt.hash(password, 10);
        await client.query(
          `UPDATE users SET full_name = $1, username = COALESCE($2, username), phone = $3, email = $4, password_hash = $5
           WHERE id = $6 AND clinic_id = $7`,
          [full_name, username || null, phone, email || null, passwordHash, userId, clinicId]
        );
      } else {
        await client.query(
          `UPDATE users SET full_name = $1, username = COALESCE($2, username), phone = $3, email = $4
           WHERE id = $5 AND clinic_id = $6`,
          [full_name, username || null, phone, email || null, userId, clinicId]
        );
      }

      await client.query(
        `UPDATE doctors SET medical_code = $1, specialty_id = $2 WHERE id = $3`,
        [medical_code || null, specialty_id || null, id]
      );

      if (branch_id) {
        const branchCheck = await client.query(
          `SELECT id FROM branches
           WHERE id = $1 AND clinic_id = $2 AND is_active = TRUE`,
          [branch_id, clinicId]
        );
        if (branchCheck.rows.length === 0) {
          throw new Error("BRANCH_NOT_IN_CLINIC");
        }

        await client.query(`DELETE FROM doctor_branches WHERE doctor_id = $1`, [id]);
        await client.query(
          `INSERT INTO doctor_branches (doctor_id, branch_id) VALUES ($1, $2)`,
          [id, branch_id]
        );
      }
    });
  } catch (err) {
    if (err.message === "BRANCH_NOT_IN_CLINIC") {
      return res.status(403).json({ error: "شعبه انتخابی به کلینیک شما تعلق ندارد یا غیرفعال است" });
    }
    throw err;
  }

  const { rows } = await query(
    `SELECT d.id, d.user_id, d.medical_code, d.specialty_id,
            u.full_name, u.username, u.phone, u.email, u.is_active,
            s.name AS specialty
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN specialties s ON s.id = d.specialty_id
     WHERE d.id = $1`,
    [id]
  );

  res.json({ doctor: rows[0] });
}
/* حذف یا غیرفعال‌سازی پزشک */
/* حذف یا غیرفعال‌سازی پزشک */
export async function deleteDoctor(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  // بررسی این‌که پزشک مال همین کلینیک باشه
  const doctorResult = await query(
    `SELECT d.user_id
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [id, clinicId]
  );
  if (doctorResult.rows.length === 0) {
    return res.status(404).json({ error: "پزشک یافت نشد" });
  }

  const userId = doctorResult.rows[0].user_id;

  // بررسی رکوردهای وابسته
  const checks = await query(
    `SELECT
      (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1) AS appointments,
      (SELECT COUNT(*) FROM visits WHERE doctor_id = $1) AS visits,
      (SELECT COUNT(*) FROM invoices i
       JOIN visits v ON v.id = i.visit_id
       WHERE v.doctor_id = $1) AS invoices`,
    [id]
  );

  const { appointments, visits, invoices } = checks.rows[0];
  const hasRecords =
    Number(appointments) > 0 ||
    Number(visits) > 0 ||
    Number(invoices) > 0;

  if (hasRecords) {
    const { rows } = await query(
      `UPDATE users SET is_active = false
       WHERE id = $1 AND clinic_id = $2
       RETURNING id, full_name, is_active`,
      [userId, clinicId]
    );
    return res.json({
      doctor: rows[0],
      action: "deactivated",
      message: "پزشک دارای سابقه بود و غیرفعال شد.",
    });
  }

  await query(
    `DELETE FROM users WHERE id = $1 AND clinic_id = $2`,
    [userId, clinicId]
  );
  res.json({
    action: "deleted",
    message: "پزشک حذف شد.",
  });
}
export async function activateDoctor(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const doctorResult = await query(
    `SELECT d.user_id
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [id, clinicId]
  );
  if (doctorResult.rows.length === 0) {
    return res.status(404).json({ error: "پزشک یافت نشد" });
  }

  const userId = doctorResult.rows[0].user_id;

  const { rows } = await query(
    `UPDATE users SET is_active = TRUE
     WHERE id = $1 AND clinic_id = $2
     RETURNING id, full_name, is_active`,
    [userId, clinicId]
  );
  res.json({ doctor: rows[0] });
}
export async function deactivateDoctor(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const doctorResult = await query(
    `SELECT d.user_id
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [id, clinicId]
  );
  if (doctorResult.rows.length === 0) {
    return res.status(404).json({ error: "پزشک یافت نشد" });
  }

  const userId = doctorResult.rows[0].user_id;

  const { rows } = await query(
    `UPDATE users SET is_active = FALSE
     WHERE id = $1 AND clinic_id = $2
     RETURNING id, full_name, is_active`,
    [userId, clinicId]
  );
  res.json({ doctor: rows[0] });
}
/* دریافت یک پزشک بر اساس id */
export async function getDoctorById(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const { rows } = await query(
    `SELECT d.id, d.user_id, d.medical_code, d.specialty_id,
            u.full_name, u.username, u.phone, u.email, u.is_active, -- u.email
            s.name AS specialty,
            db.branch_id,
            b.name AS branch_name
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN specialties s ON s.id = d.specialty_id
     LEFT JOIN doctor_branches db ON db.doctor_id = d.id
     LEFT JOIN branches b ON b.id = db.branch_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [id, clinicId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: "پزشک یافت نشد" });
  }

  res.json({ doctor: rows[0] });
}