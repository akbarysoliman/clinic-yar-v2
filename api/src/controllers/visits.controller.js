import { query, withTransaction } from "../db.js";
import { createNotification } from "../utils/notifications.js";

/**
 * ثبت ویزیت به همراه نسخه (اختیاری) در یک تراکنش واحد،
 * و به‌روزرسانی خودکار وضعیت نوبت به completed.
 * body: { appointment_id, patient_id, doctor_id, diagnosis, treatment_plan, prescriptions: [{medicine, dosage, duration, notes}] }
 */
export async function createVisit(req, res) {
  const { appointment_id, patient_id, diagnosis, treatment_plan } = req.body;
  const prescriptions = Array.isArray(req.body.prescriptions) ? req.body.prescriptions : [];
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }
  if (!patient_id) {
    return res.status(400).json({ error: "انتخاب بیمار الزامی است" });
  }

  try {
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

    const patientResult = await query(
      `SELECT id FROM patients WHERE id = $1 AND clinic_id = $2`,
      [patient_id, clinicId]
    );
    if (!patientResult.rows[0]) {
      return res.status(404).json({ error: "بیمار در این کلینیک یافت نشد" });
    }

    if (appointment_id) {
      const appointmentResult = await query(
        `SELECT a.id
         FROM appointments a
         JOIN branches b ON b.id = a.branch_id
         WHERE a.id = $1 AND a.patient_id = $2 AND a.doctor_id = $3 AND b.clinic_id = $4`,
        [appointment_id, patient_id, doctorId, clinicId]
      );
      if (!appointmentResult.rows[0]) {
        return res.status(403).json({ error: "نوبت انتخاب‌شده با بیمار، پزشک یا کلینیک مطابقت ندارد" });
      }
    }

    const visit = await withTransaction(async (client) => {
      // ⭐ چک کردن اینکه آیا از قبل ویزیتی برای این نوبت ثبت شده یا نه
      if (appointment_id) {
        const existingVisit = await client.query(
          `SELECT id FROM visits WHERE appointment_id = $1`,
          [appointment_id]
        );
        if (existingVisit.rows.length > 0) {
          throw new Error("VISIT_ALREADY_EXISTS");
        }
      }

      const visitResult = await client.query(
        `INSERT INTO visits (appointment_id, patient_id, doctor_id, diagnosis, treatment_plan)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [appointment_id || null, patient_id, doctorId, diagnosis || null, treatment_plan || null]
      );
      const v = visitResult.rows[0];

      for (const p of prescriptions) {
        if (!p?.medicine) continue;
        await client.query(
          `INSERT INTO prescriptions (visit_id, medicine, dosage, duration, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [v.id, p.medicine, p.dosage || null, p.duration || null, p.notes || null]
        );
      }

      if (appointment_id) {
        await client.query(
          `UPDATE appointments SET status = 'completed'
           WHERE id = $1 AND patient_id = $2 AND doctor_id = $3`,
          [appointment_id, patient_id, doctorId]
        );
      }
      return v;
    });

    // ساخت اعلان برای بیمار (اگه پرونده به حساب بیمار متصل باشه)
    try {
      const linkInfo = await query(
        `SELECT pl.account_id
         FROM patient_links pl
         WHERE pl.patient_id = $1 AND pl.verified = TRUE
         LIMIT 1`,
        [patient_id]
      );

      if (linkInfo.rows[0]?.account_id) {
        const doctorInfo = await query(
          `SELECT u.full_name AS doctor_name
           FROM doctors d
           JOIN users u ON u.id = d.user_id
           WHERE d.id = $1`,
          [doctorId]
        );

        const rxCount = prescriptions.filter((p) => p?.medicine).length;
        const rxMessage = rxCount > 0
          ? `تعداد ${rxCount} قلم دارو برای شما تجویز شد.`
          : "ویزیت شما ثبت شد.";

        await createNotification({
          patientAccountId: linkInfo.rows[0].account_id,
          clinicId,
          type: "visit_created",
          title: "نسخه‌ی جدید ثبت شد",
          message: `ویزیت شما توسط دکتر ${doctorInfo.rows[0]?.doctor_name || ""} ثبت شد. ${rxMessage}`,
          link: "/patient/prescriptions",
          metadata: {
            visit_id: visit.id,
            doctor_id: doctorId,
          },
        });
      }
    } catch (notifErr) {
      console.error("خطا در ساخت اعلان نسخه:", notifErr.message);
    }

    res.status(201).json({ visit });

  } catch (error) {
    // مدیریت خطای تکراری بودن ویزیت
    if (error.message === "VISIT_ALREADY_EXISTS") {
      return res.status(409).json({
        error: "برای این نوبت قبلاً ویزیت ثبت شده است. لطفاً از صفحه پرونده بیمار، ویزیت را ویرایش کنید.",
        code: "VISIT_ALREADY_EXISTS",
      });
    }
    
    // مدیریت خطای دیتابیس (اگر به هر دلیلی از دست چک بالا در رفت)
    if (error.code === "23505" && error.constraint === "visits_appointment_id_key") {
       return res.status(409).json({
        error: "برای این نوبت قبلاً ویزیت ثبت شده است.",
        code: "VISIT_ALREADY_EXISTS",
      });
    }

    console.error("Error in createVisit:", error);
    return res.status(500).json({ error: "خطا در ثبت ویزیت" });
  }
}

export async function getVisit(req, res) {
  const { id } = req.params;
  const clinicId = req.user?.clinic_id;
  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }
  if (!['doctor', 'branch_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: "شما به پرونده پزشکی دسترسی ندارید" });
  }

  const params = [id, clinicId];
  let doctorFilter = "";
  if (req.user.role === "doctor") {
    const doctorResult = await query(
      `SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 AND u.clinic_id = $2 AND u.is_active = TRUE LIMIT 1`,
      [req.user.id, clinicId]
    );
    const doctorId = doctorResult.rows[0]?.id;
    if (!doctorId) return res.status(403).json({ error: "پروفایل پزشک یافت نشد" });
    params.push(doctorId);
    doctorFilter = `AND v.doctor_id = $3`;
  }

  const { rows } = await query(
    `SELECT v.*
     FROM visits v
     JOIN doctors d ON d.id = v.doctor_id
     JOIN users u ON u.id = d.user_id
     WHERE v.id = $1 AND u.clinic_id = $2 ${doctorFilter}`,
    params
  );
  const visit = rows[0];
  if (!visit) return res.status(404).json({ error: "ویزیت در این کلینیک یافت نشد" });

  const rx = await query(`SELECT * FROM prescriptions WHERE visit_id = $1`, [id]);
  res.json({ visit, prescriptions: rx.rows });
}