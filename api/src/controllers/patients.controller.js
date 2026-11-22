import { query } from "../db.js";

export async function listPatients(req, res) {
  const clinicId = req.user?.clinic_id;
  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  let doctorId;
  if (req.user.role === "doctor") {
    const ownDoctor = await query(
      `SELECT d.id
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 AND u.clinic_id = $2 AND u.is_active = TRUE
       LIMIT 1`,
      [req.user.id, clinicId]
    );
    if (!ownDoctor.rows[0]) {
      return res.status(403).json({ error: "پروفایل پزشک برای این کلینیک یافت نشد" });
    }
    doctorId = ownDoctor.rows[0].id;
  } else {
    if (!req.query.doctor_id) {
      return res.status(400).json({ error: "پارامتر doctor_id الزامی است" });
    }
    const doctorResult = await query(
      `SELECT d.id
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = $1 AND u.clinic_id = $2`,
      [req.query.doctor_id, clinicId]
    );
    if (!doctorResult.rows[0]) {
      return res.status(404).json({ error: "پزشک در این کلینیک یافت نشد" });
    }
    doctorId = doctorResult.rows[0].id;
  }

    const { rows } = await query(
    `SELECT DISTINCT p.id, p.full_name, p.phone, p.birth_date,
            p.national_code, p.gender, p.address,
            MAX(v.created_at) OVER (PARTITION BY p.id) AS last_visit_at
     FROM patients p
     JOIN visits v ON v.patient_id = p.id
     JOIN doctors d ON d.id = v.doctor_id
     JOIN users du ON du.id = d.user_id
     WHERE p.clinic_id = $1
       AND du.clinic_id = $1
       AND v.doctor_id = $2
     ORDER BY p.full_name`,
    [clinicId, doctorId]
  );
  res.json({ patients: rows });
}

export async function searchPatients(req, res) {
  const clinicId = req.user?.clinic_id;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }
  if (q.length < 2) {
    return res.status(400).json({ error: "حداقل ۲ حرف برای جست‌وجو وارد کنید" });
  }

  const { rows } = await query(
    `SELECT id, full_name, phone, national_code, birth_date
     FROM patients
     WHERE clinic_id = $1
       AND (full_name ILIKE $2 OR phone ILIKE $2 OR national_code = $3)
     ORDER BY full_name
     LIMIT 20`,
    [clinicId, `%${q}%`, q]
  );
  res.json({ patients: rows });
}

export async function createPatient(req, res) {
  const { full_name, phone, national_code, birth_date, gender, address } = req.body;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }
if (!full_name || !phone || !national_code) {
  return res.status(400).json({ error: "نام، شماره تماس و کد ملی بیمار الزامی است" });
}
  const patientEntitlement = req.license?.license?.entitlements?.max_patients;
  if (!patientEntitlement) {
    return res.status(403).json({
      error: "محدودیت تعداد بیماران در اطلاعات لایسنس مشخص نیست",
      code: "LICENSE_ENTITLEMENT_MISSING",
    });
  }
  if (patientEntitlement.enabled === false) {
    return res.status(403).json({
      error: "امکان ثبت بیمار در پلن فعلی فعال نیست",
      code: "MAX_PATIENTS_DISABLED",
    });
  }

  if (patientEntitlement.limit !== null) {
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS count FROM patients WHERE clinic_id = $1`,
      [clinicId]
    );
    const currentPatients = countRows[0].count;
    const maxPatients = Number(patientEntitlement.limit);
    if (currentPatients >= maxPatients) {
      return res.status(403).json({
        error: "تعداد بیماران به سقف مجاز لایسنس رسیده است",
        code: "MAX_PATIENTS_EXCEEDED",
        limit: maxPatients,
        current: currentPatients,
      });
    }
  }
  // چک تکراری نبودن شماره موبایل یا کد ملی
  const dupConditions = [];
  const dupParams = [clinicId];

  if (phone) {
    dupParams.push(phone);
    dupConditions.push(`phone = $${dupParams.length}`);
  }
  if (national_code) {
    dupParams.push(national_code);
    dupConditions.push(`national_code = $${dupParams.length}`);
  }

  if (dupConditions.length > 0) {
    const dup = await query(
      `SELECT id, full_name, phone, national_code
       FROM patients
       WHERE clinic_id = $1 AND (${dupConditions.join(" OR ")})
       LIMIT 1`,
      dupParams
    );

    if (dup.rows.length > 0) {
      const existing = dup.rows[0];
      return res.status(409).json({
        error: "بیمار با این شماره تماس یا کد ملی قبلاً ثبت شده است",
        code: "PATIENT_ALREADY_EXISTS",
        existing_patient: {
          id: existing.id,
          full_name: existing.full_name,
          phone: existing.phone,
          national_code: existing.national_code,
        },
      });
    }
  }
  const { rows } = await query(
    `INSERT INTO patients
      (full_name, phone, national_code, birth_date, gender, address, created_by, clinic_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      full_name, phone, national_code,
      birth_date || null, gender || null, address || null,
      req.user.id, clinicId,
    ]
  );

  const patient = rows[0];

  // =========================================================
  // ⭐ اتصال خودکار بیمار به حساب کاربری (patient_accounts)
  // =========================================================
  try {
    // ۱. آیا حساب کاربری برای این موبایل وجود داره؟
    let accountId;
    const accountCheck = await query(
      `SELECT id FROM patient_accounts WHERE phone = $1 LIMIT 1`,
      [phone]
    );

    if (accountCheck.rows.length > 0) {
      accountId = accountCheck.rows[0].id;
    } else {
      // اگر حساب وجود نداره، بسازش
      const newAccount = await query(
        `INSERT INTO patient_accounts (phone, full_name, national_code)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [phone, full_name, national_code]
      );
      accountId = newAccount.rows[0].id;
    }

    // ۲. بررسی اینکه این اتصال قبلاً ساخته شده یا نه
    const linkCheck = await query(
      `SELECT id FROM patient_links WHERE account_id = $1 AND patient_id = $2`,
      [accountId, patient.id]
    );

    if (linkCheck.rows.length === 0) {
      // اتصال خودکار با verified = TRUE
      await query(
        `INSERT INTO patient_links (account_id, patient_id, clinic_id, verified, verified_at)
         VALUES ($1, $2, $3, TRUE, NOW())`,
        [accountId, patient.id, clinicId]
      );
    }
  } catch (linkError) {
    console.error("خطا در اتصال خودکار بیمار:", linkError);
    // اگر خطا داد، بیمار ساخته شده ولی اتصال انجام نشده - ادامه بده
  }

  res.status(201).json({ patient });
}

export async function getPatient(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;
  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const patientResult = await query(
    `SELECT * FROM patients WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  const patient = patientResult.rows[0];
  if (!patient) return res.status(404).json({ error: "بیمار در این کلینیک یافت نشد" });

  if (req.user.role === "doctor") {
    const doctorResult = await query(
      `SELECT d.id
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 AND u.clinic_id = $2 AND u.is_active = TRUE
       LIMIT 1`,
      [req.user.id, clinicId]
    );
    const doctorId = doctorResult.rows[0]?.id;
    if (!doctorId) {
      return res.status(403).json({ error: "پروفایل پزشک برای این کلینیک یافت نشد" });
    }

    const accessResult = await query(
      `SELECT EXISTS (
         SELECT 1
         FROM visits v
         JOIN doctors d ON d.id = v.doctor_id
         JOIN users u ON u.id = d.user_id
         WHERE v.patient_id = $1 AND v.doctor_id = $2 AND u.clinic_id = $3
         UNION ALL
         SELECT 1
         FROM appointments a
         JOIN branches b ON b.id = a.branch_id
         WHERE a.patient_id = $1 AND a.doctor_id = $2 AND b.clinic_id = $3
       ) AS allowed`,
      [id, doctorId, clinicId]
    );
    if (!accessResult.rows[0]?.allowed) {
      return res.status(404).json({ error: "پرونده بیمار یافت نشد" });
    }
  }

   // منشی و حسابدار فقط اطلاعات هویتی رو می‌بینن، نه ویزیت‌ها
  const isMedicalRole = ["doctor", "branch_admin", "super_admin"].includes(req.user.role);

  if (!isMedicalRole) {
    return res.json({ patient, visits: [] });
  }

  const visitsResult = await query(
    `SELECT v.id, v.diagnosis, v.treatment_plan, v.created_at,
            d.id AS doctor_id, u.full_name AS doctor_name
     FROM visits v
     JOIN doctors d ON d.id = v.doctor_id
     JOIN users u ON u.id = d.user_id
     WHERE v.patient_id = $1 AND u.clinic_id = $2
     ORDER BY v.created_at DESC`,
    [id, clinicId]
  );

  const visitIds = visitsResult.rows.map((v) => v.id);
  let prescriptionsByVisit = {};
  if (visitIds.length > 0) {
    const rxResult = await query(
      `SELECT * FROM prescriptions WHERE visit_id = ANY($1::int[])`,
      [visitIds]
    );
    prescriptionsByVisit = rxResult.rows.reduce((acc, rx) => {
      (acc[rx.visit_id] ||= []).push(rx);
      return acc;
    }, {});
  }

  const visits = visitsResult.rows.map((v) => ({
    ...v,
    prescriptions: prescriptionsByVisit[v.id] || [],
  }));

  res.json({ patient, visits });
}
/* ویرایش بیمار */
export async function updatePatient(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;
  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  const {
    full_name,
    phone,
    national_code,
    birth_date,
    gender,
    address,
  } = req.body;

if (!full_name || !phone || !national_code) {
  return res.status(400).json({ error: "نام، شماره تماس و کد ملی الزامی است" });
}
  // بررسی وجود بیمار در همین کلینیک
  const existing = await query(
    `SELECT id FROM patients WHERE id = $1 AND clinic_id = $2`,
    [id, clinicId]
  );
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "بیمار در این کلینیک یافت نشد" });
  }

  // بررسی تکراری نبودن شماره تماس
  if (phone) {
    const dup = await query(
      `SELECT id FROM patients WHERE phone = $1 AND clinic_id = $2 AND id <> $3`,
      [phone, clinicId, id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: "شماره تماس قبلاً برای بیمار دیگری ثبت شده است" });
    }
  }
  // بررسی تکراری نبودن کد ملی در همین کلینیک
  if (national_code) {
    const dupNC = await query(
      `SELECT id FROM patients 
       WHERE national_code = $1 AND clinic_id = $2 AND id <> $3`,
      [national_code, clinicId, id]
    );
    if (dupNC.rows.length > 0) {
      return res.status(409).json({
        error: "کد ملی قبلاً برای بیمار دیگری در این کلینیک ثبت شده است",
        code: "DUPLICATE_NATIONAL_CODE",
      });
    }
  }
  const { rows } = await query(
    `UPDATE patients
     SET full_name = $1,
         phone = $2,
         national_code = $3,
         birth_date = $4,
         gender = $5,
         address = $6
     WHERE id = $7 AND clinic_id = $8
     RETURNING *`,
    [
      full_name,
      phone,
      national_code,
      birth_date || null,
      gender || null,
      address || null,
      id,
      clinicId,
    ]
  );

  res.json({ patient: rows[0] });
}
