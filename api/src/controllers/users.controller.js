import bcrypt from "bcryptjs";
import { query, withTransaction } from "../db.js";
import { effectiveBranchId } from "../middleware/auth.js";

export async function listUsers(req, res) {
  const clinicId = req.user?.clinic_id;
  const branchId = effectiveBranchId(req);
  const role = req.query.role;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const conditions = [`u.clinic_id = $1`];
  const params = [clinicId];

  if (branchId) {
    params.push(branchId);
    conditions.push(`u.branch_id = $${params.length}`);
  }

  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const { rows } = await query(
    `SELECT u.id, u.full_name, u.username, u.phone, u.email, u.role, u.branch_id, u.is_active, u.created_at,
            d.id AS doctor_id,
            (SELECT json_agg(json_build_object('id', o.id, 'name', o.name))
             FROM secretary_offices so
             JOIN offices o ON o.id = so.office_id
             WHERE so.user_id = u.id) AS offices
     FROM users u
     LEFT JOIN doctors d ON d.user_id = u.id
     ${where}
     ORDER BY u.created_at DESC`,
    params
  );

  res.json({ users: rows });
}
const CREATABLE_ROLES = ["branch_admin", "doctor", "secretary", "accountant"];

/**
 * ساخت کاربر جدید. super_admin می‌تواند برای هر شعبه‌ای کاربر بسازد؛
 * branch_admin فقط می‌تواند برای شعبه خودش کاربر بسازد (حتی اگر branch_id دیگری بفرستد، نادیده گرفته می‌شود).
 */
export async function createUser(req, res) {
  const { full_name, username, phone, password, role, specialty_id, office_id, doctor_id, medical_code } = req.body;
  let { branch_id } = req.body;
  const clinicId = req.user?.clinic_id;

  // ============================================================
  // ۱) اعتبارسنجی اولیه
  // ============================================================
  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  if (!full_name || !phone || !password || !role) {
    return res.status(400).json({ error: "نام، شماره تماس، رمز عبور و نقش الزامی است" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد" });
  }
  if (!CREATABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: "نقش نامعتبر است" });
  }

  // ============================================================
  // ۲) تعیین شعبه
  // ============================================================
  if (req.user.role !== "super_admin") {
    branch_id = req.user.branch_id;
  }
  if (!branch_id) {
    return res.status(400).json({ error: "شعبه الزامی است" });
  }

  // چک کن شعبه مال همین کلینیکه و فعاله
  const branchCheck = await query(
    `SELECT id FROM branches
     WHERE id = $1 AND clinic_id = $2 AND is_active = TRUE`,
    [branch_id, clinicId]
  );
  if (branchCheck.rows.length === 0) {
    return res.status(403).json({ error: "شعبه انتخابی به کلینیک شما تعلق ندارد یا غیرفعال است" });
  }

  // ============================================================
  // ۳) بررسی محدودیت پزشک / منشی طبق Entitlement لایسنس
  // ============================================================
  if (role === "doctor" || role === "secretary") {
    const entitlementKey = role === "doctor" ? "max_doctors" : "max_secretaries";
    const entitlement = req.license?.license?.entitlements?.[entitlementKey];

    if (!entitlement) {
      return res.status(403).json({
        error: "محدودیت این نوع کاربر در اطلاعات لایسنس مشخص نیست",
        code: "LICENSE_ENTITLEMENT_MISSING",
      });
    }

    if (entitlement.enabled === false) {
      return res.status(403).json({
        error:
          role === "doctor"
            ? "امکان ایجاد پزشک در پلن فعلی فعال نیست"
            : "امکان ایجاد منشی در پلن فعلی فعال نیست",
        code:
          role === "doctor"
            ? "MAX_DOCTORS_DISABLED"
            : "MAX_SECRETARIES_DISABLED",
      });
    }

    if (entitlement.limit !== null) {
      const { rows: countRows } = await query(
        `SELECT COUNT(*)::int AS count
         FROM users
         WHERE role = $1
           AND is_active = true
           AND clinic_id = $2`,
        [role, clinicId]
      );

      const currentCount = countRows[0].count;
      const maxCount = Number(entitlement.limit);

      if (currentCount >= maxCount) {
        return res.status(403).json({
          error:
            role === "doctor"
              ? "تعداد پزشکان فعال به سقف مجاز لایسنس رسیده است"
              : "تعداد منشی‌های فعال به سقف مجاز لایسنس رسیده است",
          code:
            role === "doctor"
              ? "MAX_DOCTORS_EXCEEDED"
              : "MAX_SECRETARIES_EXCEEDED",
          limit: maxCount,
          current: currentCount,
        });
      }
    }
  }

  // ============================================================
  // ۴) هش کردن رمز عبور
  // ============================================================
  const passwordHash = await bcrypt.hash(password, 10);

  // ============================================================
  // ۵) تراکنش: ساخت کاربر + اتصالات
  // ============================================================
  try {
    const user = await withTransaction(async (client) => {
      // ۵-۱) ساخت کاربر
      const userResult = await client.query(
        `INSERT INTO users (full_name, username, phone, password_hash, role, branch_id, clinic_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, full_name, username, phone, role, branch_id, clinic_id, is_active`,
        [full_name, username || null, phone, passwordHash, role, branch_id, clinicId]
      );
      const u = userResult.rows[0];

      // ۵-۲) اگه پزشک: ساخت رکورد doctor + اتصال به شعبه
      if (role === "doctor") {
        const doctorResult = await client.query(
          `INSERT INTO doctors (user_id, specialty_id, medical_code)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [u.id, specialty_id || null, medical_code || null]
        );
        await client.query(
          `INSERT INTO doctor_branches (doctor_id, branch_id) VALUES ($1, $2)`,
          [doctorResult.rows[0].id, branch_id]
        );
      }

      // ۵-۳) اگه منشی و office_id داره: چک کن مطب مال همین کلینیکه و فعاله + اتصال
      if (role === "secretary" && office_id) {
        const officeCheck = await client.query(
          `SELECT id FROM offices
           WHERE id = $1 AND clinic_id = $2 AND is_active = TRUE`,
          [office_id, clinicId]
        );
        if (officeCheck.rows.length === 0) {
          throw new Error("OFFICE_NOT_IN_CLINIC");
        }

        await client.query(
          `INSERT INTO secretary_offices (user_id, office_id) VALUES ($1, $2)`,
          [u.id, office_id]
        );
      }

      // ۵-۴) اگه منشی و doctor_id داره: چک کن پزشک مال همین کلینیکه و فعاله + اتصال
      if (role === "secretary" && doctor_id) {
        const doctorCheck = await client.query(
          `SELECT d.id
           FROM doctors d
           JOIN users du ON du.id = d.user_id
           WHERE d.id = $1 AND du.clinic_id = $2 AND du.is_active = TRUE`,
          [doctor_id, clinicId]
        );
        if (doctorCheck.rows.length === 0) {
          throw new Error("DOCTOR_NOT_IN_CLINIC");
        }

        await client.query(
          `INSERT INTO doctor_secretaries (doctor_id, user_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [doctor_id, u.id]
        );
      }

      return u;
    });

    res.status(201).json({ user });
  } catch (err) {
    // مدیریت خطاهای شناخته‌شده
    if (err.code === "23505") {
      return res.status(409).json({ error: "شماره تماس قبلاً ثبت شده است" });
    }
    if (err.message === "OFFICE_NOT_IN_CLINIC") {
      return res.status(403).json({ error: "مطب انتخابی به کلینیک شما تعلق ندارد یا غیرفعال است" });
    }
    if (err.message === "DOCTOR_NOT_IN_CLINIC") {
      return res.status(403).json({ error: "پزشک انتخابی به کلینیک شما تعلق ندارد یا غیرفعال است" });
    }
    console.error("createUser error:", err);
    throw err;
  }
}
export async function deactivateUser(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const { rows } = await query(
    `UPDATE users SET is_active = FALSE
     WHERE id = $1 AND clinic_id = $2
     RETURNING id, full_name, is_active`,
    [id, clinicId]
  );
  if (!rows[0]) return res.status(404).json({ error: "کاربر یافت نشد" });
  res.json({ user: rows[0] });
}
/* ویرایش کاربر (منشی، حسابدار و ...) */
export async function updateUser(req, res) {
  const { id } = req.params;
  const { full_name, username, phone, email, office_id, doctor_id } = req.body;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }
  if (!full_name) {
    return res.status(400).json({ error: "نام کامل الزامی است" });
  }

  // بررسی وجود کاربر در همین کلینیک
  const userCheck = await query(
    `SELECT id, role FROM users WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }

  const user = userCheck.rows[0];

  // ⭐ چک کردن تکراری بودن شماره تلفن (برای کاربران دیگر)
  if (phone) {
    const phoneCheck = await query(
      `SELECT id FROM users WHERE phone = $1 AND id != $2`,
      [phone, id]
    );
    if (phoneCheck.rows.length > 0) {
      return res.status(409).json({
        error: "این شماره تلفن قبلاً برای کاربر دیگری ثبت شده است",
        code: "DUPLICATE_PHONE",
      });
    }
  }

  // ⭐ چک کردن تکراری بودن نام کاربری (برای کاربران دیگر)
  if (username) {
    const usernameCheck = await query(
      `SELECT id FROM users WHERE username = $1 AND id != $2`,
      [username, id]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({
        error: "این نام کاربری قبلاً برای کاربر دیگری ثبت شده است",
        code: "DUPLICATE_USERNAME",
      });
    }
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE users SET full_name = $1, username = $2, phone = $3, email = $4
       WHERE id = $5 AND clinic_id = $6`,
      [full_name, username || null, phone || null, email || null, id, clinicId]
    );

    if (user.role === "secretary") {
      await client.query(`DELETE FROM secretary_offices WHERE user_id = $1`, [id]);
      if (office_id) {
        await client.query(
          `INSERT INTO secretary_offices (user_id, office_id) VALUES ($1, $2)`,
          [id, office_id]
        );
      }

      await client.query(`DELETE FROM doctor_secretaries WHERE user_id = $1`, [id]);
      if (doctor_id) {
        await client.query(
          `INSERT INTO doctor_secretaries (doctor_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [doctor_id, id]
        );
      }
    }
  });

  const { rows } = await query(
    `SELECT u.id, u.full_name, u.phone, u.email, u.role, u.branch_id, u.is_active,
            (SELECT json_agg(json_build_object('id', o.id, 'name', o.name))
             FROM secretary_offices so
             JOIN offices o ON o.id = so.office_id
             WHERE so.user_id = u.id) AS offices
     FROM users u
     WHERE u.id = $1 AND u.clinic_id = $2`,
    [id, clinicId]
  );

  res.json({ user: rows[0] });
}
export async function activateUser(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const { rows } = await query(
    `UPDATE users SET is_active = TRUE
     WHERE id = $1 AND clinic_id = $2
     RETURNING id, full_name, is_active`,
    [id, clinicId]
  );
  if (!rows[0]) return res.status(404).json({ error: "کاربر یافت نشد" });
  res.json({ user: rows[0] });
}
/* حذف یا غیرفعال‌سازی کاربر */
/* حذف یا غیرفعال‌سازی کاربر */
export async function deleteUser(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const userCheck = await query(
    `SELECT id, role FROM users WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }

  const user = userCheck.rows[0];

  // بررسی رکوردهای وابسته (بر اساس نقش)
  let hasRecords = false;

  if (user.role === "secretary") {
    const checks = await query(
      `SELECT
        (SELECT COUNT(*) FROM appointments WHERE booked_by = $1) AS appointments,
        (SELECT COUNT(*) FROM invoices i
         JOIN visits v ON v.id = i.visit_id
         JOIN appointments a ON a.id = v.appointment_id
         WHERE a.booked_by = $1) AS invoices`,
      [id]
    );
    const { appointments, invoices } = checks.rows[0];
    hasRecords = Number(appointments) > 0 || Number(invoices) > 0;
  }

  if (hasRecords) {
    const { rows } = await query(
      `UPDATE users SET is_active = false
       WHERE id = $1 AND clinic_id = $2
       RETURNING id, full_name, is_active`,
      [id, clinicId]
    );
    return res.json({
      user: rows[0],
      action: "deactivated",
      message: "کاربر دارای سابقه بود و غیرفعال شد.",
    });
  }

  await query(
    `DELETE FROM users WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  res.json({
    action: "deleted",
    message: "کاربر حذف شد.",
  });
}