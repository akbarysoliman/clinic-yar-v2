import { query } from "../db.js";
import { effectiveBranchId } from "../middleware/auth.js";
import { createNotification } from "../utils/notifications.js";
import { sendSms } from "../utils/smsService.js";
/**
 * فهرست نوبت‌ها — برای صف امروز و نمای تقویم پزشک استفاده می‌شود
 * پارامترها: branch_id (اختیاری اگر کاربر خودش محدود به یک شعبه باشد)، doctor_id، date (YYYY-MM-DD میلادی)
 */
export async function listAppointments(req, res) {
  const clinicId = req.user?.clinic_id;
  if (!clinicId) return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });

  const { date } = req.query;
  let branchId = effectiveBranchId(req);
  if (req.user.role === "super_admin") branchId = req.query.branch_id || null;
  else if (req.query.branch_id && branchId && String(req.query.branch_id) !== String(branchId)) {
    return res.status(403).json({ error: "به این شعبه دسترسی ندارید" });
  } else if (!branchId && req.query.branch_id) {
    branchId = req.query.branch_id;
  }

  if (branchId) {
    const branchResult = await query(
      `SELECT id FROM branches WHERE id = $1 AND clinic_id = $2`,
      [branchId, clinicId]
    );
    if (!branchResult.rows[0]) return res.status(403).json({ error: "شعبه در این کلینیک مجاز نیست" });
  }

  let doctorId;
  if (req.user.role === "doctor") {
    const ownDoctor = await query(
      `SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 AND u.clinic_id = $2 AND u.is_active = TRUE LIMIT 1`,
      [req.user.id, clinicId]
    );
    doctorId = ownDoctor.rows[0]?.id;
    if (!doctorId) return res.status(403).json({ error: "پروفایل پزشک یافت نشد" });
  } else if (req.query.doctor_id) {
    const doctorResult = await query(
      `SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.id = $1 AND u.clinic_id = $2`,
      [req.query.doctor_id, clinicId]
    );
    if (!doctorResult.rows[0]) return res.status(403).json({ error: "به این پزشک دسترسی ندارید" });
    doctorId = doctorResult.rows[0].id;
  }

  const conditions = ["b.clinic_id = $1", "p.clinic_id = $1", "du.clinic_id = $1"];
  const params = [clinicId];
  if (branchId) {
    params.push(branchId);
    conditions.push(`a.branch_id = $${params.length}`);
  }
  if (doctorId) {
    params.push(doctorId);
    conditions.push(`a.doctor_id = $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`a.appointment_at::date = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT a.id, a.appointment_at, a.status, a.notes,
            p.id AS patient_id, p.full_name AS patient_name, p.phone AS patient_phone,
            d.id AS doctor_id, u.full_name AS doctor_name
     FROM appointments a
     JOIN branches b ON b.id = a.branch_id
     JOIN patients p ON p.id = a.patient_id
     JOIN doctors d ON d.id = a.doctor_id
     JOIN users du ON du.id = d.user_id
     JOIN users u ON u.id = d.user_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY a.appointment_at`,
    params
  );

  res.json({ appointments: rows });
}

export async function createAppointment(req, res) {
  const { patient_id, doctor_id, branch_id, appointment_at, notes } = req.body;
  const clinicId = req.user?.clinic_id;
  const allowedRoles = ["super_admin", "branch_admin", "secretary", "doctor"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "اجازه ثبت نوبت ندارید" });
  }
  if (!clinicId) return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  if (!patient_id || !doctor_id || !branch_id || !appointment_at) {
    return res.status(400).json({ error: "بیمار، پزشک، شعبه و زمان نوبت الزامی است" });
  }

  const branchResult = await query(
    `SELECT id FROM branches WHERE id = $1 AND clinic_id = $2 AND is_active = TRUE`,
    [branch_id, clinicId]
  );
  if (!branchResult.rows[0]) return res.status(403).json({ error: "شعبه انتخاب‌شده در این کلینیک مجاز نیست" });

  if (req.user.role !== "super_admin" && req.user.role !== "doctor" && req.user.branch_id &&
      String(req.user.branch_id) !== String(branch_id)) {
    return res.status(403).json({ error: "به این شعبه دسترسی ندارید" });
  }

  const patientResult = await query(
    `SELECT id FROM patients WHERE id = $1 AND clinic_id = $2`,
    [patient_id, clinicId]
  );
  if (!patientResult.rows[0]) return res.status(404).json({ error: "بیمار در این کلینیک یافت نشد" });

  let actualDoctorId = doctor_id;
  if (req.user.role === "doctor") {
    const ownDoctor = await query(
      `SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 AND u.clinic_id = $2 AND u.is_active = TRUE LIMIT 1`,
      [req.user.id, clinicId]
    );
    actualDoctorId = ownDoctor.rows[0]?.id;
    if (!actualDoctorId || String(actualDoctorId) !== String(doctor_id)) {
      return res.status(403).json({ error: "پزشک نوبت باید حساب خودتان باشد" });
    }
  }

  const doctorResult = await query(
    `SELECT d.id
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     JOIN doctor_branches db ON db.doctor_id = d.id AND db.branch_id = $2
     WHERE d.id = $1 AND u.clinic_id = $3 AND u.is_active = TRUE`,
    [actualDoctorId, branch_id, clinicId]
  );
  if (!doctorResult.rows[0]) return res.status(403).json({ error: "پزشک به این کلینیک یا شعبه متصل نیست" });

  const conflict = await query(
    `SELECT id FROM appointments
     WHERE doctor_id = $1 AND appointment_at = $2 AND status NOT IN ('cancelled', 'no_show')`,
    [actualDoctorId, appointment_at]
  );
  if (conflict.rows.length > 0) {
    return res.status(409).json({ error: "این زمان قبلاً برای این پزشک رزرو شده است" });
  }

    try {
      const { rows } = await query(
        `INSERT INTO appointments (patient_id, doctor_id, branch_id, appointment_at, notes, booked_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [patient_id, actualDoctorId, branch_id, appointment_at, notes || null, req.user.id]
      );

      // ساخت اعلان برای پزشک (اگه خود پزشک نوبت رو ثبت نکرده باشه)
      if (req.user.role !== "doctor") {
        const patientInfo = await query(
          `SELECT full_name FROM patients WHERE id = $1`,
          [patient_id]
        );
        const doctorUserInfo = await query(
          `SELECT u.id AS user_id, u.full_name AS doctor_name
           FROM doctors d
           JOIN users u ON u.id = d.user_id
           WHERE d.id = $1`,
          [actualDoctorId]
        );
        const branchInfo = await query(
          `SELECT name FROM branches WHERE id = $1`,
          [branch_id]
        );

        const doctorUser = doctorUserInfo.rows[0];
        if (doctorUser?.user_id) {
          const appointmentDate = new Date(appointment_at).toLocaleString("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          await createNotification({
            userId: doctorUser.user_id,
            clinicId,
            type: "appointment_created",
            title: "نوبت جدید ثبت شد",
            message: `${patientInfo.rows[0]?.full_name || "بیمار"} برای شما در ${branchInfo.rows[0]?.name || ""} در تاریخ ${appointmentDate} نوبت گرفت.`,
            link: "/doctor/calendar",
            metadata: {
              appointment_id: rows[0].id,
              patient_id: patient_id,
              branch_id: branch_id,
            },
          });
        }
      }

      res.status(201).json({ appointment: rows[0] });
    } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "این زمان قبلاً برای این پزشک رزرو شده است" });
    }
    throw err;
  }
}

const VALID_STATUSES = ["booked", "checked_in", "in_visit", "completed", "cancelled", "no_show"];

export async function updateAppointmentStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const clinicId = req.user?.clinic_id;
  const allowedRoles = ["super_admin", "branch_admin", "secretary", "doctor"];

  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: "اجازه تغییر وضعیت نوبت ندارید" });
  if (!clinicId) return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "وضعیت نوبت نامعتبر است" });
  }

  const { rows: foundRows } = await query(
    `SELECT a.id, a.branch_id, a.doctor_id, b.clinic_id, du.id AS doctor_user_id
     FROM appointments a
     JOIN branches b ON b.id = a.branch_id
     JOIN doctors d ON d.id = a.doctor_id
     JOIN users du ON du.id = d.user_id
     JOIN patients p ON p.id = a.patient_id
     WHERE a.id = $1 AND b.clinic_id = $2 AND du.clinic_id = $2 AND p.clinic_id = $2`,
    [id, clinicId]
  );
  const appointment = foundRows[0];
  if (!appointment) return res.status(404).json({ error: "نوبت در این کلینیک یافت نشد" });

  if (req.user.role === "doctor" && String(appointment.doctor_user_id) !== String(req.user.id)) {
    return res.status(403).json({ error: "فقط می‌توانید وضعیت نوبت‌های خودتان را تغییر دهید" });
  }
  if (req.user.role !== "super_admin" && req.user.role !== "doctor" && req.user.branch_id &&
      String(req.user.branch_id) !== String(appointment.branch_id)) {
    return res.status(403).json({ error: "به این شعبه دسترسی ندارید" });
  }

  const { rows } = await query(
    `UPDATE appointments SET status = $1 WHERE id = $2 AND branch_id = $3 RETURNING *`,
    [status, id, appointment.branch_id]
  );
  if (!rows[0]) return res.status(404).json({ error: "نوبت یافت نشد" });
  res.json({ appointment: rows[0] });
}
/* ============================================================ */
/* لیست درخواست‌های نوبت (pending) — برای منشی/مدیر              */
/* ============================================================ */

/* ============================================================ */
/* فهرست درخواست‌های نوبت در انتظار تأیید                       */
/* ============================================================ */
export async function listPendingAppointments(req, res) {
  const clinicId = req.user?.clinic_id;
  const branchId = effectiveBranchId(req);

  if (!clinicId) {
    return res.status(403).json({
      error: "حساب کاربری به کلینیک متصل نیست",
    });
  }

  try {
    const params = [clinicId];
    let branchCondition = "";

    if (branchId) {
      params.push(branchId);
      branchCondition = `AND a.branch_id = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT
         a.id,
         a.appointment_at,
         a.status,
         a.notes,
         a.created_at,
         a.booked_by_patient,
         p.id AS patient_id,
         p.full_name AS patient_name,
         p.phone AS patient_phone,
         p.national_code AS patient_national_code,
         d.id AS doctor_id,
         u.full_name AS doctor_name,
         s.name AS doctor_specialty,
         b.id AS branch_id,
         b.name AS branch_name,
         c.id AS clinic_id,
         c.name AS clinic_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN specialties s ON s.id = d.specialty_id
       JOIN branches b ON b.id = a.branch_id
       JOIN clinics c ON c.id = b.clinic_id
       WHERE c.id = $1
         AND p.clinic_id = $1
         AND u.clinic_id = $1
         ${branchCondition}
         AND a.status = 'pending'
         AND a.booked_by_patient IS NOT NULL
       ORDER BY a.created_at DESC`,
      params
    );

    return res.json({ pending: rows });
  } catch (err) {
    console.error("listPendingAppointments error:", err);
    return res.status(500).json({
      error: "خطا در دریافت درخواست‌ها",
    });
  }
}

/* ============================================================ */
/* تأیید یا رد درخواست نوبت                                     */
/* ============================================================ */
export async function reviewAppointment(req, res) {
  const clinicId = req.user?.clinic_id;
  const branchId = effectiveBranchId(req);
  const { id } = req.params;
  const { action } = req.body;

  if (!clinicId) {
    return res.status(403).json({
      error: "حساب کاربری به کلینیک متصل نیست",
    });
  }

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({
      error: "عملیات نامعتبر است",
    });
  }

  try {
    const params = [id, clinicId];
    let branchCondition = "";

    if (branchId) {
      params.push(branchId);
      branchCondition = `AND a.branch_id = $${params.length}`;
    }

    const check = await query(
      `SELECT
         a.id,
         a.status,
         a.doctor_id,
         a.appointment_at,
         a.patient_id,
         a.branch_id,
         a.booked_by_patient,
         p.full_name AS patient_name,
         u.full_name AS doctor_name,
         b.name AS branch_name
       FROM appointments a
       JOIN branches b ON b.id = a.branch_id
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE a.id = $1
         AND b.clinic_id = $2
         AND p.clinic_id = $2
         AND u.clinic_id = $2
         ${branchCondition}`,
      params
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        error: "درخواست یافت نشد",
      });
    }

    const appointment = check.rows[0];

    if (appointment.status !== "pending") {
      return res.status(409).json({
        error: "این درخواست قبلاً بررسی شده است",
        code: "ALREADY_REVIEWED",
      });
    }

    if (action === "approve") {
      const conflict = await query(
        `SELECT id
         FROM appointments
         WHERE doctor_id = $1
           AND appointment_at = $2
           AND status IN ('booked', 'checked_in', 'in_visit')
           AND id <> $3
         LIMIT 1`,
        [
          appointment.doctor_id,
          appointment.appointment_at,
          id,
        ]
      );

      if (conflict.rows.length > 0) {
        return res.status(409).json({
          error: "این زمان قبلاً توسط نوبت دیگری گرفته شده است",
          code: "SLOT_TAKEN",
        });
      }
    }

    const newStatus = action === "approve" ? "booked" : "rejected";

    // فقط یک درخواست می‌تواند وضعیت pending را تغییر دهد.
    // شرط کلینیک و شعبه در خود UPDATE نیز اعمال می‌شود.
    const updateParams = [newStatus, id, clinicId];
    let updateBranchCondition = "";

    if (branchId) {
      updateParams.push(branchId);
      updateBranchCondition = `AND a.branch_id = $${updateParams.length}`;
    }

    let rows;

    try {
      const result = await query(
        `UPDATE appointments a
         SET status = $1
         WHERE a.id = $2
           AND a.status = 'pending'
           AND EXISTS (
             SELECT 1
             FROM branches b
             JOIN patients p ON p.id = a.patient_id
             JOIN doctors d ON d.id = a.doctor_id
             JOIN users u ON u.id = d.user_id
             WHERE b.id = a.branch_id
               AND b.clinic_id = $3
               AND p.clinic_id = $3
               AND u.clinic_id = $3
               ${updateBranchCondition}
           )
         RETURNING a.id, a.status, a.appointment_at`,
        updateParams
      );

      rows = result.rows;
    } catch (err) {
      if (action === "approve" && err.code === "23505") {
        return res.status(409).json({
          error: "این زمان قبلاً توسط نوبت دیگری گرفته شده است",
          code: "SLOT_TAKEN",
        });
      }
      throw err;
    }

    if (rows.length === 0) {
      return res.status(409).json({
        error: "درخواست قبلاً بررسی شده یا دیگر قابل تغییر نیست",
        code: "ALREADY_REVIEWED",
      });
    }

    // تغییر وضعیت موفق شده است؛ شکست اعلان نباید نتیجه آن را
    // به خطای 500 تبدیل کند.
    if (appointment.booked_by_patient) {
      try {
        const appointmentDate = new Date(
          appointment.appointment_at
        ).toLocaleString("fa-IR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const approved = action === "approve";

        await createNotification({
          patientAccountId: appointment.booked_by_patient,
          clinicId,
          type: approved
            ? "appointment_confirmed"
            : "appointment_rejected",
          title: approved
            ? "نوبت شما تأیید شد"
            : "درخواست نوبت شما رد شد",
          message: approved
            ? `نوبت شما با دکتر ${appointment.doctor_name} در ${appointment.branch_name} برای ${appointmentDate} تأیید شد.`
            : `متأسفانه درخواست نوبت شما با دکتر ${appointment.doctor_name} در ${appointment.branch_name} برای ${appointmentDate} رد شد.`,
          link: approved
            ? "/patient/appointments"
            : "/patient/new-appointment",
          metadata: {
            appointment_id: appointment.id,
            doctor_id: appointment.doctor_id,
          },
        });
      } catch (notificationError) {
        console.error(
          "reviewAppointment notification error:",
          notificationError
        );
      }
    }

    return res.json({
      appointment: rows[0],
      message:
        action === "approve"
          ? "درخواست نوبت تأیید شد"
          : "درخواست نوبت رد شد",
    });
  } catch (err) {
    console.error("reviewAppointment error:", err);
    return res.status(500).json({
      error: "خطا در بررسی درخواست",
    });
  }
}
export async function rescheduleAppointment(req, res) {
  const { id } = req.params;
  const { new_date, new_time, reason } = req.body; 
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  if (!new_date || !new_time) {
    return res.status(400).json({ error: "تاریخ و ساعت جدید الزامی است" });
  }

  try {
    const apptResult = await query(
      `SELECT a.id, a.patient_id, a.doctor_id, a.branch_id, a.appointment_at, a.status
       FROM appointments a
       JOIN branches b ON b.id = a.branch_id
       WHERE a.id = $1 AND b.clinic_id = $2`,
      [id, clinicId]
    );

    const appt = apptResult.rows[0];
    if (!appt) {
      return res.status(404).json({ error: "نوبت یافت نشد" });
    }

    if (appt.status === "completed" || appt.status === "cancelled") {
      return res.status(400).json({ error: "نوبت‌های تکمیل‌شده یا لغوشده قابل انتقال نیستند" });
    }

    const newAppointmentAt = `${new_date}T${new_time}:00+03:30`;

    const conflict = await query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1 AND appointment_at = $2 
         AND status IN ('booked', 'checked_in', 'in_visit', 'pending')
         AND id != $3`,
      [appt.doctor_id, newAppointmentAt, id]
    );

    if (conflict.rows.length > 0) {
      return res.status(409).json({
        error: "این زمان برای این پزشک قبلاً رزرو شده است. لطفاً زمان دیگری انتخاب کنید.",
        code: "SLOT_TAKEN",
      });
    }

    const { rows } = await query(
      `UPDATE appointments 
       SET appointment_at = $1, status = 'booked', notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING id, appointment_at, status, patient_id, doctor_id`,
      [newAppointmentAt, reason ? `انتقال نوبت: ${reason}` : null, id]
    );

    // گرفتن اطلاعات پزشک (برای استفاده در اعلان و پیامک)
    const doctorInfo = await query(
      `SELECT u.full_name AS doctor_name FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id = $1`,
      [appt.doctor_id]
    );
    const doctorName = doctorInfo.rows[0]?.doctor_name || "";

    // ارسال اعلان به بیمار
    try {
      const linkInfo = await query(
        `SELECT pl.account_id FROM patient_links pl WHERE pl.patient_id = $1 AND pl.verified = TRUE LIMIT 1`,
        [appt.patient_id]
      );

      if (linkInfo.rows[0]?.account_id) {
        await createNotification({
          patientAccountId: linkInfo.rows[0].account_id,
          clinicId,
          type: "appointment_rescheduled",
          title: "نوبت شما منتقل شد",
          message: `نوبت شما با دکتر ${doctorName} به تاریخ ${new_date} ساعت ${new_time} منتقل شد. ${reason ? `علت: ${reason}` : ""}`,
          link: "/patient/appointments",
          metadata: { appointment_id: id, new_date, new_time, reason: reason || null },
        });
      }
    } catch (notifErr) {
      console.error("خطا در ساخت اعلان انتقال نوبت:", notifErr.message);
    }

    // ⭐ ارسال پیامک به بیمار (داخل try اصلی و قبل از res.json)
    try {
      const patientPhone = await query(
        `SELECT phone FROM patients WHERE id = $1`,
        [appt.patient_id]
      );
      if (patientPhone.rows[0]?.phone) {
        const smsMessage = `نوبت شما با دکتر ${doctorName} به تاریخ ${new_date} ساعت ${new_time} منتقل شد. ${reason ? `علت: ${reason}` : ""}`;
        await sendSms(patientPhone.rows[0].phone, smsMessage);
      }
    } catch (smsErr) {
      console.error("خطا در ارسال پیامک انتقال نوبت:", smsErr.message);
    }

    res.json({
      appointment: rows[0],
      message: "نوبت با موفقیت منتقل شد",
    });
  } catch (err) {
    console.error("rescheduleAppointment error:", err);
    res.status(500).json({ error: "خطا در انتقال نوبت" });
  }
}


export async function bulkRescheduleAppointments(req, res) {
  const { appointment_ids, new_date, reason } = req.body;
  const clinicId = req.user?.clinic_id;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  if (!appointment_ids || !Array.isArray(appointment_ids) || appointment_ids.length === 0 || !new_date) {
    return res.status(400).json({ error: "لیست نوبت‌ها و تاریخ جدید الزامی است" });
  }

  const successList = [];
  const failedList = [];

  try {
    for (const id of appointment_ids) {
      try {
        const apptResult = await query(
          `SELECT a.id, a.patient_id, a.doctor_id, a.branch_id, a.appointment_at, a.status
           FROM appointments a
           JOIN branches b ON b.id = a.branch_id
           WHERE a.id = $1 AND b.clinic_id = $2`,
          [id, clinicId]
        );
        const appt = apptResult.rows[0];
        if (!appt || appt.status === "completed" || appt.status === "cancelled") {
          failedList.push({ id, reason: "نوبت یافت نشد یا غیرقابل انتقال است" });
          continue;
        }

        const oldTime = new Date(appt.appointment_at).toTimeString().slice(0, 5);
        const newAppointmentAt = `${new_date}T${oldTime}:00+03:30`;

        const conflict = await query(
          `SELECT id FROM appointments
           WHERE doctor_id = $1 AND appointment_at = $2 
             AND status IN ('booked', 'checked_in', 'in_visit', 'pending')
             AND id != $3`,
          [appt.doctor_id, newAppointmentAt, id]
        );

        if (conflict.rows.length > 0) {
          failedList.push({ id, patient_id: appt.patient_id, reason: "این ساعت قبلاً رزرو شده است" });
          continue;
        }

        await query(
          `UPDATE appointments SET appointment_at = $1, status = 'booked', notes = COALESCE($2, notes) WHERE id = $3`,
          [newAppointmentAt, reason ? `انتقال گروهی: ${reason}` : null, id]
        );
        successList.push(id);

        // گرفتن اطلاعات پزشک و بیمار (برای اعلان و پیامک)
        const doctorInfo = await query(
          `SELECT u.full_name AS doctor_name FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id = $1`,
          [appt.doctor_id]
        );
        const doctorName = doctorInfo.rows[0]?.doctor_name || "";
        
        const patientInfo = await query(
          `SELECT phone FROM patients WHERE id = $1`,
          [appt.patient_id]
        );
        const patientPhone = patientInfo.rows[0]?.phone;

        // ارسال اعلان به بیمار
        try {
          const linkInfo = await query(
            `SELECT pl.account_id FROM patient_links pl WHERE pl.patient_id = $1 AND pl.verified = TRUE LIMIT 1`,
            [appt.patient_id]
          );
          if (linkInfo.rows[0]?.account_id) {
            await createNotification({
              patientAccountId: linkInfo.rows[0].account_id,
              clinicId,
              type: "appointment_rescheduled",
              title: "نوبت شما منتقل شد",
              message: `نوبت شما با دکتر ${doctorName} به تاریخ ${new_date} ساعت ${oldTime} منتقل شد. ${reason ? `علت: ${reason}` : ""}`,
              link: "/patient/appointments",
              metadata: { appointment_id: id, new_date, new_time: oldTime, reason: reason || null },
            });
          }
        } catch (notifErr) {
          console.error("خطا در اعلان انتقال گروهی:", notifErr.message);
        }

        // ⭐ ارسال پیامک به بیمار
        try {
          if (patientPhone) {
            const smsMessage = `نوبت شما با دکتر ${doctorName} به تاریخ ${new_date} ساعت ${oldTime} منتقل شد. ${reason ? `علت: ${reason}` : ""}`;
            await sendSms(patientPhone, smsMessage);
          }
        } catch (smsErr) {
          console.error("خطا در ارسال پیامک انتقال گروهی:", smsErr.message);
        }
      } catch (err) {
        failedList.push({ id, reason: "خطای داخلی در پردازش" });
      }
    }

    res.json({
      success: true,
      message: `${successList.length} نوبت منتقل شد. ${failedList.length} نوبت منتقل نشد.`,
      successList,
      failedList,
    });
  } catch (err) {
    console.error("bulkRescheduleAppointments error:", err);
    res.status(500).json({ error: "خطا در انتقال گروهی نوبت‌ها" });
  }
}