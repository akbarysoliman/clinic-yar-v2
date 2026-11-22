import { query } from "../db.js";
import { effectiveBranchId } from "../middleware/auth.js";

const AGGREGATE_SELECT = `
  SELECT b.*,
    (SELECT COUNT(DISTINCT db.doctor_id) FROM doctor_branches db WHERE db.branch_id = b.id) AS doctor_count,
    (SELECT COUNT(DISTINCT ob.office_id) FROM office_branches ob WHERE ob.branch_id = b.id) AS office_count,
    (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.role = 'secretary' AND u.is_active = TRUE) AS receptionist_count,
    (SELECT COUNT(*) FROM appointments a
       WHERE a.branch_id = b.id AND a.appointment_at::date = CURRENT_DATE
         AND a.status NOT IN ('cancelled', 'no_show')) AS today_appointments,
    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       WHERE i.branch_id = b.id AND p.paid_at::date = CURRENT_DATE) AS today_revenue
  FROM branches b
`;

export async function listBranches(req, res) {
  const clinicId = req.user?.clinic_id;
  const branchId = effectiveBranchId(req);

  const conditions = [];
  const params = [];

  if (clinicId) {
    params.push(clinicId);
    conditions.push(`b.clinic_id = $${params.length}`);
  }

  if (branchId) {
    params.push(branchId);
    conditions.push(`b.id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await query(`${AGGREGATE_SELECT} ${where} ORDER BY b.name`, params);
  res.json({ branches: rows });
}
export async function createBranch(req, res) {
  const { name, address, phone } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "نام شعبه الزامی است",
    });
  }

  const branchEntitlement =
    req.license?.license?.entitlements?.max_branches;

  if (!branchEntitlement) {
    return res.status(403).json({
      error: "محدودیت تعداد شعب در اطلاعات لایسنس مشخص نیست",
      code: "LICENSE_ENTITLEMENT_MISSING",
    });
  }

  if (branchEntitlement.enabled === false) {
    return res.status(403).json({
      error: "امکان ایجاد شعبه در پلن فعلی فعال نیست",
      code: "MAX_BRANCHES_DISABLED",
    });
  }

  if (branchEntitlement.limit !== null) {
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM branches
       WHERE is_active = true AND clinic_id = $1`,
      [req.user.clinic_id]
    );
    const currentBranches = countRows[0].count;
    const maxBranches = Number(branchEntitlement.limit);

    if (currentBranches >= maxBranches) {
      return res.status(403).json({
        error: "تعداد شعب فعال به سقف مجاز لایسنس رسیده است",
        code: "MAX_BRANCHES_EXCEEDED",
        max_branches: maxBranches,
        current_branches: currentBranches,
      });
    }
  }

   const { rows } = await query(
    `INSERT INTO branches (name, address, phone, clinic_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, address || null, phone || null, req.user.clinic_id || null]
  );

  res.status(201).json({
    branch: rows[0],
  });
}

/* ویرایش شعبه */
export async function updateBranch(req, res) {
  const { id } = req.params;
  const { name, address, phone } = req.body;

  if (!name) {
    return res.status(400).json({ error: "نام شعبه الزامی است" });
  }

  const { rows } = await query(
    `UPDATE branches SET name = $1, address = $2, phone = $3 WHERE id = $4 RETURNING *`,
    [name, address || null, phone || null, id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: "شعبه یافت نشد" });
  }

  res.json({ branch: rows[0] });
}

/* حذف یا غیرفعال‌سازی شعبه */
/* حذف یا غیرفعال‌سازی شعبه */
export async function deleteBranch(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  // چک کن شعبه مال همین کلینیکه
  const branchCheck = await query(
    `SELECT id FROM branches WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  if (branchCheck.rows.length === 0) {
    return res.status(404).json({ error: "شعبه یافت نشد" });
  }

  // بررسی وابستگی‌ها (شامل users)
  const checks = await query(
    `SELECT
      (SELECT COUNT(*) FROM users WHERE branch_id = $1) AS users,
      (SELECT COUNT(*) FROM appointments WHERE branch_id = $1) AS appointments,
      (SELECT COUNT(*) FROM invoices WHERE branch_id = $1) AS invoices,
      (SELECT COUNT(*) FROM doctor_branches WHERE branch_id = $1) AS doctors,
      (SELECT COUNT(*) FROM office_branches WHERE branch_id = $1) AS offices`,
    [id]
  );

  const { users, appointments, invoices, doctors, offices } = checks.rows[0];
  const hasRecords =
    Number(users) > 0 ||
    Number(appointments) > 0 ||
    Number(invoices) > 0 ||
    Number(doctors) > 0 ||
    Number(offices) > 0;

  if (hasRecords) {
    const { rows } = await query(
      `UPDATE branches SET is_active = false
       WHERE id = $1 AND clinic_id = $2
       RETURNING *`,
      [id, clinicId]
    );
    return res.json({
      branch: rows[0],
      action: "deactivated",
      message: "شعبه دارای وابستگی بود و غیرفعال شد.",
    });
  }

  const { rows } = await query(
    `DELETE FROM branches WHERE id = $1 AND clinic_id = $2 RETURNING *`,
    [id, clinicId]
  );
  return res.json({
    branch: rows[0],
    action: "deleted",
    message: "شعبه حذف شد.",
  });
}
export async function activateBranch(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const { rows } = await query(
    `UPDATE branches SET is_active = TRUE
     WHERE id = $1 AND clinic_id = $2
     RETURNING *`,
    [id, clinicId]
  );
  if (!rows[0]) return res.status(404).json({ error: "شعبه یافت نشد" });
  res.json({ branch: rows[0] });
}

export async function deactivateBranch(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const { rows } = await query(
    `UPDATE branches SET is_active = FALSE
     WHERE id = $1 AND clinic_id = $2
     RETURNING *`,
    [id, clinicId]
  );
  if (!rows[0]) return res.status(404).json({ error: "شعبه یافت نشد" });
  res.json({ branch: rows[0] });
}