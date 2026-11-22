import { query, withTransaction } from "../db.js";

/* ============================================================ */
/* لیست مطب‌ها + جستجو + فیلتر شعبه                              */
/* ============================================================ */
export async function listOffices(req, res) {
  const clinicId = req.user?.clinic_id;
  const search = (req.query.q || "").trim();
  const branchId = req.query.branch_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const conditions = [`o.clinic_id = $1`];
  const params = [clinicId];

  if (branchId) {
    params.push(branchId);
    conditions.push(`EXISTS (SELECT 1 FROM office_branches ob WHERE ob.office_id = o.id AND ob.branch_id = $${params.length})`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(o.name ILIKE $${params.length} OR o.address ILIKE $${params.length} OR o.phone ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const { rows } = await query(
    `SELECT o.*,
      (SELECT COUNT(*) FROM office_doctors od WHERE od.office_id = o.id) AS doctor_count,
      (SELECT json_agg(json_build_object('id', b.id, 'name', b.name))
       FROM office_branches ob JOIN branches b ON b.id = ob.branch_id
       WHERE ob.office_id = o.id) AS branches
     FROM offices o
     ${where}
     ORDER BY o.name`,
    params
  );

  res.json({ offices: rows });
}

/* ============================================================ */
/* یک مطب خاص (با چک clinic_id)                                 */
/* ============================================================ */
export async function getOffice(req, res) {
  const clinicId = req.user?.clinic_id;
  const { id } = req.params;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const { rows } = await query(
    `SELECT o.*,
      (SELECT json_agg(json_build_object('id', b.id, 'name', b.name))
       FROM office_branches ob JOIN branches b ON b.id = ob.branch_id
       WHERE ob.office_id = o.id) AS branches,
      (SELECT json_agg(json_build_object('id', d.id, 'full_name', u.full_name))
       FROM office_doctors od
       JOIN doctors d ON d.id = od.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE od.office_id = o.id) AS doctors
     FROM offices o
     WHERE o.id = $1 AND o.clinic_id = $2`,
    [id, clinicId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "مطب در این کلینیک یافت نشد" });
  }

  res.json({ office: rows[0] });
}

/* ============================================================ */
/* ساخت مطب جدید                                                 */
/* ============================================================ */
export async function createOffice(req, res) {
  const clinicId = req.user?.clinic_id;
  const { name, address, phone } = req.body;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  if (!name) {
    return res.status(400).json({ error: "نام مطب الزامی است" });
  }

  const { rows } = await query(
    `INSERT INTO offices (name, address, phone, clinic_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, address || null, phone || null, clinicId]
  );

  res.status(201).json({ office: rows[0] });
}

/* ============================================================ */
/* ویرایش مطب                                                    */
/* ============================================================ */
export async function updateOffice(req, res) {
  const clinicId = req.user?.clinic_id;
  const { id } = req.params;
  const { name, address, phone } = req.body;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  if (!name) {
    return res.status(400).json({ error: "نام مطب الزامی است" });
  }

  const check = await query(
    `SELECT id FROM offices WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );

  if (check.rows.length === 0) {
    return res.status(404).json({ error: "مطب در این کلینیک یافت نشد" });
  }

  const { rows } = await query(
    `UPDATE offices SET name = $1, address = $2, phone = $3
     WHERE id = $4 AND clinic_id = $5
     RETURNING *`,
    [name, address || null, phone || null, id, clinicId]
  );

  res.json({ office: rows[0] });
}
/* ============================================================ */
/* حذف یا غیرفعال‌سازی مطب                                       */
/* ============================================================ */
export async function deleteOffice(req, res) {
  const clinicId = req.user?.clinic_id;
  const { id } = req.params;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const officeCheck = await query(
    `SELECT id FROM offices WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );

  if (officeCheck.rows.length === 0) {
    return res.status(404).json({ error: "مطب در این کلینیک یافت نشد" });
  }

  const checks = await query(
    `SELECT
      (SELECT COUNT(*) FROM office_doctors WHERE office_id = $1) AS doctors,
      (SELECT COUNT(*) FROM office_branches WHERE office_id = $1) AS branches,
      (SELECT COUNT(*) FROM secretary_offices WHERE office_id = $1) AS secretaries`,
    [id]
  );

  const { doctors, branches, secretaries } = checks.rows[0];
  const hasRecords =
    Number(doctors) > 0 ||
    Number(branches) > 0 ||
    Number(secretaries) > 0;

  if (hasRecords) {
    const { rows } = await query(
      `UPDATE offices SET is_active = false
       WHERE id = $1 AND clinic_id = $2
       RETURNING *`,
      [id, clinicId]
    );
    return res.json({
      office: rows[0],
      action: "deactivated",
      message: "مطب دارای رکورد بود و غیرفعال شد.",
    });
  } else {
    const { rows } = await query(
      `DELETE FROM offices WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [id, clinicId]
    );
    return res.json({
      office: rows[0],
      action: "deleted",
      message: "مطب حذف شد.",
    });
  }
}
export async function activateOffice(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const { rows } = await query(
    `UPDATE offices SET is_active = TRUE
     WHERE id = $1 AND clinic_id = $2
     RETURNING *`,
    [id, clinicId]
  );
  if (!rows[0]) return res.status(404).json({ error: "مطب یافت نشد" });
  res.json({ office: rows[0] });
}

export async function deactivateOffice(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const { rows } = await query(
    `UPDATE offices SET is_active = FALSE
     WHERE id = $1 AND clinic_id = $2
     RETURNING *`,
    [id, clinicId]
  );
  if (!rows[0]) return res.status(404).json({ error: "مطب یافت نشد" });
  res.json({ office: rows[0] });
}
/* ============================================================ */
/* اختصاص مطب به شعبه (با چک clinic_id)                          */
/* ============================================================ */
export async function assignOfficeToBranch(req, res) {
  const clinicId = req.user?.clinic_id;
  const { id } = req.params;
  const { branch_id } = req.body;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  if (!branch_id) {
    return res.status(400).json({ error: "شناسه شعبه الزامی است" });
  }

  // بررسی اینکه مطب به این کلینیک تعلق داره
  const officeCheck = await query(
    `SELECT id FROM offices WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  if (officeCheck.rows.length === 0) {
    return res.status(404).json({ error: "مطب در این کلینیک یافت نشد" });
  }

  // بررسی اینکه شعبه به این کلینیک تعلق داره
  // بررسی اینکه شعبه به این کلینیک تعلق داره و فعاله
const branchCheck = await query(
  `SELECT id FROM branches
   WHERE id = $1 AND clinic_id = $2 AND is_active = TRUE`,
  [branch_id, clinicId]
);
if (branchCheck.rows.length === 0) {
  return res.status(404).json({ error: "شعبه در این کلینیک یافت نشد یا غیرفعال است" });
}

  await query(
    `INSERT INTO office_branches (office_id, branch_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [id, branch_id]
  );

  const { rows } = await query(
    `SELECT b.id, b.name FROM office_branches ob
     JOIN branches b ON b.id = ob.branch_id
     WHERE ob.office_id = $1`,
    [id]
  );
  res.json({ branches: rows });
}

/* ============================================================ */
/* حذف ارتباط مطب و شعبه (با چک clinic_id)                       */
/* ============================================================ */
export async function removeOfficeFromBranch(req, res) {
  const clinicId = req.user?.clinic_id;
  const { id, branchId } = req.params;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  // بررسی این‌که مطب به این کلینیک تعلق داره
  const officeCheck = await query(
    `SELECT id FROM offices WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  if (officeCheck.rows.length === 0) {
    return res.status(404).json({ error: "مطب در این کلینیک یافت نشد" });
  }

  // بررسی این‌که شعبه هم مال همین کلینیکه
  const branchCheck = await query(
    `SELECT id FROM branches WHERE id = $1 AND clinic_id = $2`,
    [branchId, clinicId]
  );
  if (branchCheck.rows.length === 0) {
    return res.status(404).json({ error: "شعبه در این کلینیک یافت نشد" });
  }

  await query(
    `DELETE FROM office_branches WHERE office_id = $1 AND branch_id = $2`,
    [id, branchId]
  );
  res.json({ success: true });
}
/* ============================================================ */
/* اختصاص پزشک به مطب (با چک clinic_id)                          */
/* ============================================================ */
export async function assignDoctorToOffice(req, res) {
  const clinicId = req.user?.clinic_id;
  const { id } = req.params;
  const { doctor_id } = req.body;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  if (!doctor_id) {
    return res.status(400).json({ error: "شناسه پزشک الزامی است" });
  }

  // بررسی اینکه مطب به این کلینیک تعلق داره
  const officeCheck = await query(
    `SELECT id FROM offices WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  if (officeCheck.rows.length === 0) {
    return res.status(404).json({ error: "مطب در این کلینیک یافت نشد" });
  }

  // بررسی اینکه پزشک به این کلینیک تعلق داره
  const doctorCheck = await query(
    `SELECT d.id FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [doctor_id, clinicId]
  );
  if (doctorCheck.rows.length === 0) {
    return res.status(404).json({ error: "پزشک در این کلینیک یافت نشد" });
  }

  await query(
    `INSERT INTO office_doctors (office_id, doctor_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [id, doctor_id]
  );

  const { rows } = await query(
    `SELECT d.id, u.full_name FROM office_doctors od
     JOIN doctors d ON d.id = od.doctor_id
     JOIN users u ON u.id = d.user_id
     WHERE od.office_id = $1`,
    [id]
  );
  res.json({ doctors: rows });
}

/* ============================================================ */
/* حذف ارتباط مطب و پزشک (با چک clinic_id)                       */
/* ============================================================ */
export async function removeDoctorFromOffice(req, res) {
  const clinicId = req.user?.clinic_id;
  const { id, doctorId } = req.params;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const officeCheck = await query(
    `SELECT id FROM offices WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  if (officeCheck.rows.length === 0) {
    return res.status(404).json({ error: "مطب در این کلینیک یافت نشد" });
  }

  const doctorCheck = await query(
    `SELECT d.id FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND u.clinic_id = $2`,
    [doctorId, clinicId]
  );
  if (doctorCheck.rows.length === 0) {
    return res.status(404).json({ error: "پزشک در این کلینیک یافت نشد" });
  }

  await query(
    `DELETE FROM office_doctors WHERE office_id = $1 AND doctor_id = $2`,
    [id, doctorId]
  );
  res.json({ success: true });
}