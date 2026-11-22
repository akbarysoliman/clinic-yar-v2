import { query } from "../db.js";

export async function dashboardSummary(req, res) {
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  // ============================================================
  // 1. شمارش کل و فعال
  // ============================================================
  const counts = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM branches WHERE clinic_id = $1) AS branches_total,
       (SELECT COUNT(*)::int FROM branches WHERE clinic_id = $1 AND is_active = TRUE) AS branches_active,
       (SELECT COUNT(*)::int FROM offices WHERE clinic_id = $1) AS offices_total,
       (SELECT COUNT(*)::int FROM offices WHERE clinic_id = $1 AND is_active = TRUE) AS offices_active,
       (SELECT COUNT(*)::int FROM doctors d JOIN users u ON u.id = d.user_id WHERE u.clinic_id = $1) AS doctors_total,
       (SELECT COUNT(*)::int FROM doctors d JOIN users u ON u.id = d.user_id WHERE u.clinic_id = $1 AND u.is_active = TRUE) AS doctors_active,
       (SELECT COUNT(*)::int FROM users WHERE clinic_id = $1 AND role = 'secretary') AS secretaries_total,
       (SELECT COUNT(*)::int FROM users WHERE clinic_id = $1 AND role = 'secretary' AND is_active = TRUE) AS secretaries_active`,
    [clinicId]
  );

  // ============================================================
  // 2. هشدارها — آیتم‌های یتیم (بدون ارتباط)
  // ============================================================

  // 2-1. مطب‌های بدون شعبه
  const officesWithoutBranch = await query(
    `SELECT o.id, o.name
     FROM offices o
     WHERE o.clinic_id = $1
       AND o.is_active = TRUE
       AND NOT EXISTS (SELECT 1 FROM office_branches ob WHERE ob.office_id = o.id)
     ORDER BY o.name`,
    [clinicId]
  );

  // 2-2. پزشکان بدون مطب
  const doctorsWithoutOffice = await query(
    `SELECT d.id, u.full_name AS name
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE u.clinic_id = $1
       AND u.is_active = TRUE
       AND NOT EXISTS (SELECT 1 FROM office_doctors od WHERE od.doctor_id = d.id)
     ORDER BY u.full_name`,
    [clinicId]
  );

  // 2-3. منشی‌های بدون مطب
  const secretariesWithoutOffice = await query(
    `SELECT u.id, u.full_name AS name
     FROM users u
     WHERE u.clinic_id = $1
       AND u.role = 'secretary'
       AND u.is_active = TRUE
       AND NOT EXISTS (SELECT 1 FROM secretary_offices so WHERE so.user_id = u.id)
     ORDER BY u.full_name`,
    [clinicId]
  );

  // 2-4. شعبه‌های بدون پزشک
  const branchesWithoutDoctor = await query(
    `SELECT b.id, b.name
     FROM branches b
     WHERE b.clinic_id = $1
       AND b.is_active = TRUE
       AND NOT EXISTS (SELECT 1 FROM doctor_branches db WHERE db.branch_id = b.id)
     ORDER BY b.name`,
    [clinicId]
  );

  // ============================================================
  // 3. آیتم‌های غیرفعال (برای نمایش اسم)
  // ============================================================
  const inactiveItems = await query(
    `SELECT 'branch' AS type, b.id, b.name
       FROM branches b
       WHERE b.clinic_id = $1 AND b.is_active = FALSE
     UNION ALL
     SELECT 'office' AS type, o.id, o.name
       FROM offices o
       WHERE o.clinic_id = $1 AND o.is_active = FALSE
     UNION ALL
     SELECT 'doctor' AS type, d.id, u.full_name AS name
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE u.clinic_id = $1 AND u.is_active = FALSE
     UNION ALL
     SELECT 'secretary' AS type, u.id, u.full_name AS name
       FROM users u
       WHERE u.clinic_id = $1 AND u.role = 'secretary' AND u.is_active = FALSE
     ORDER BY type, name`,
    [clinicId]
  );

  res.json({
    counts: counts.rows[0],
    warnings: {
      officesWithoutBranch: officesWithoutBranch.rows,
      doctorsWithoutOffice: doctorsWithoutOffice.rows,
      secretariesWithoutOffice: secretariesWithoutOffice.rows,
      branchesWithoutDoctor: branchesWithoutDoctor.rows,
    },
    inactiveItems: inactiveItems.rows,
  });
}