import { query, withTransaction } from "../db.js";
import { createNotification, createNotificationForRole, createNotificationForRoles } from "../utils/notifications.js";
/* ============================================================ */
/* Middleware: بررسی توکن بیمار (role === "patient")             */
/* ============================================================ */
export function requirePatient(req, res, next) {
  if (!req.user || req.user.role !== "patient") {
    return res.status(403).json({ error: "دسترسی فقط برای بیمار مجاز است" });
  }
  next();
}

/* ============================================================ */
/* لیست پرونده‌های بالقوه بیمار (بر اساس phone یا national_code)  */
/* ============================================================ */
export async function listPotentialRecords(req, res) {
  const accountId = req.user.account_id;
  if (!accountId) {
    return res.status(403).json({ error: "حساب بیمار یافت نشد" });
  }

  try {
    // اطلاعات حساب بیمار
    const accountResult = await query(
      `SELECT id, phone, national_code, full_name FROM patient_accounts WHERE id = $1`,
      [accountId]
    );

    const account = accountResult.rows[0];
    if (!account) {
      return res.status(404).json({ error: "حساب بیمار یافت نشد" });
    }

    // پیدا کردن پرونده‌هایی که با phone یا national_code مطابقت دارن
    const conditions = [];
    const params = [];

    if (account.phone) {
      params.push(account.phone);
      conditions.push(`p.phone = $${params.length}`);
    }
    if (account.national_code) {
      params.push(account.national_code);
      conditions.push(`p.national_code = $${params.length}`);
    }

    if (conditions.length === 0) {
      return res.json({ records: [] });
    }

    const { rows } = await query(
      `SELECT 
         p.id AS patient_id,
         p.full_name,
         p.phone,
         p.national_code,
         p.clinic_id,
         c.name AS clinic_name,
         c.company_code AS clinic_code,
         EXISTS (
           SELECT 1 FROM patient_links pl
           WHERE pl.account_id = $${params.length + 1}
             AND pl.patient_id = p.id
         ) AS already_linked
       FROM patients p
       JOIN clinics c ON c.id = p.clinic_id
       WHERE (${conditions.join(" OR ")})
       ORDER BY c.name, p.full_name`,
      [...params, accountId]
    );

    res.json({ records: rows });
  } catch (err) {
    console.error("listPotentialRecords error:", err);
    res.status(500).json({ error: "خطا در دریافت پرونده‌ها" });
  }
}

/* ============================================================ */
/* درخواست اتصال حساب به پرونده                                  */
/* ============================================================ */
export async function requestLink(req, res) {
  const accountId = req.user.account_id;
  const { patient_id } = req.body;

  if (!patient_id) {
    return res.status(400).json({ error: "شناسه پرونده الزامی است" });
  }

  try {
    // بررسی وجود پرونده
    const patientResult = await query(
      `SELECT id, clinic_id FROM patients WHERE id = $1`,
      [patient_id]
    );

    const patient = patientResult.rows[0];
    if (!patient) {
      return res.status(404).json({ error: "پرونده یافت نشد" });
    }

    // بررسی وجود ارتباط قبلی
    const existing = await query(
      `SELECT id, verified FROM patient_links
       WHERE account_id = $1 AND patient_id = $2`,
      [accountId, patient_id]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].verified) {
        return res.status(409).json({
          error: "این پرونده قبلاً به حساب شما متصل شده است",
          code: "ALREADY_LINKED",
        });
      } else {
        return res.status(409).json({
          error: "درخواست اتصال این پرونده قبلاً ارسال شده و در انتظار تأیید است",
          code: "PENDING_APPROVAL",
        });
      }
    }

    // ساخت درخواست اتصال
    const inserted = await query(
      `INSERT INTO patient_links (account_id, patient_id, clinic_id, verified)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, account_id, patient_id, clinic_id, verified, created_at`,
      [accountId, patient_id, patient.clinic_id]
    );

    res.status(201).json({
      link: inserted.rows[0],
      message: "درخواست اتصال ارسال شد و در انتظار تأیید منشی است",
    });
  } catch (err) {
    console.error("requestLink error:", err);
    res.status(500).json({ error: "خطا در ارسال درخواست" });
  }
}

/* ============================================================ */
/* لیست پرونده‌های متصل‌شده به حساب بیمار (فقط verified = TRUE)    */
/* ============================================================ */
export async function listMyRecords(req, res) {
  const accountId = req.user.account_id;

  try {
    // ⭐ فقط پرونده‌هایی که در جدول لینک‌ها (patient_links) به این حساب متصل هستند
    const { rows } = await query(
      `SELECT 
         p.id AS patient_id,
         p.full_name,
         p.phone,
         p.national_code,
         p.clinic_id,
         c.name AS clinic_name,
         c.company_code AS clinic_code,
         TRUE AS verified 
       FROM patient_links pl
       JOIN patients p ON p.id = pl.patient_id
       JOIN clinics c ON c.id = p.clinic_id
       WHERE pl.account_id = $1
       ORDER BY c.name`,
      [accountId]
    );

    res.json({ records: rows });
  } catch (err) {
    console.error("listMyRecords error:", err);
    res.status(500).json({ error: "خطا در دریافت پرونده‌ها" });
  }
}
/* ============================================================ */
/* لیست درخواست‌های اتصال در انتظار تأیید (برای منشی/مدیر)        */
/* ============================================================ */
export async function listPendingLinks(req, res) {
  const clinicId = req.user.clinic_id;
  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  try {
    const { rows } = await query(
      `SELECT 
         pl.id AS link_id,
         pl.verified,
         pl.created_at,
         pa.id AS account_id,
         pa.full_name AS account_name,
         pa.phone AS account_phone,
         pa.national_code AS account_national_code,
         p.id AS patient_id,
         p.full_name AS patient_name,
         p.phone AS patient_phone,
         p.national_code AS patient_national_code,
         c.name AS clinic_name
       FROM patient_links pl
       JOIN patient_accounts pa ON pa.id = pl.account_id
       JOIN patients p ON p.id = pl.patient_id
       JOIN clinics c ON c.id = pl.clinic_id
       WHERE pl.clinic_id = $1
         AND pl.verified = FALSE
       ORDER BY pl.created_at DESC`,
      [clinicId]
    );

    res.json({ pending: rows });
  } catch (err) {
    console.error("listPendingLinks error:", err);
    res.status(500).json({ error: "خطا در دریافت درخواست‌ها" });
  }
}

/* ============================================================ */
/* تأیید درخواست اتصال (منشی/مدیر)                                */
/* ============================================================ */
export async function approveLink(req, res) {
  const clinicId = req.user.clinic_id;
  const { id } = req.params;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  try {
    // بررسی وجود درخواست در همین کلینیک
    const check = await query(
      `SELECT id, verified FROM patient_links
       WHERE id = $1 AND clinic_id = $2`,
      [id, clinicId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "درخواست یافت نشد" });
    }

    if (check.rows[0].verified) {
      return res.status(409).json({
        error: "این درخواست قبلاً تأیید شده است",
        code: "ALREADY_VERIFIED",
      });
    }

          const { rows } = await query(
        `UPDATE patient_links
         SET verified = TRUE,
             verified_at = NOW(),
             verified_by = $1
         WHERE id = $2
           AND clinic_id = $3
           AND verified = FALSE
         RETURNING id, account_id, patient_id, clinic_id, verified, verified_at`,
        [req.user.id, id, clinicId]
      );

      if (rows.length === 0) {
        return res.status(409).json({
          error: "درخواست قبلاً بررسی شده یا دیگر قابل تأیید نیست",
          code: "LINK_ALREADY_PROCESSED",
        });
      }

      const link = rows[0];

      // ساخت اعلان برای بیمار
      const clinicInfo = await query(
        `SELECT name FROM clinics WHERE id = $1`,
        [link.clinic_id]
      );

      await createNotification({
        patientAccountId: link.account_id,
        clinicId: link.clinic_id,
        type: "link_approved",
        title: "پرونده شما تأیید شد",
        message: `درخواست اتصال شما به پرونده در ${clinicInfo.rows[0]?.name || "کلینیک"} تأیید شد. اکنون می‌توانید نوبت‌های خود را مشاهده کنید.`,
        link: "/patient/my-records",
        metadata: {
          link_id: link.id,
          patient_id: link.patient_id,
        },
      });

      res.json({
        link,
        message: "درخواست اتصال تأیید شد",
      });
  } catch (err) {
    console.error("approveLink error:", err);
    res.status(500).json({ error: "خطا در تأیید درخواست" });
  }
}

/* ============================================================ */
/* رد درخواست اتصال (منشی/مدیر)                                   */
/* ============================================================ */
export async function rejectLink(req, res) {
  const clinicId = req.user.clinic_id;
  const { id } = req.params;

  if (!clinicId) {
    return res.status(403).json({ error: "حساب کاربری به کلینیک متصل نیست" });
  }

  try {
    const check = await query(
      `SELECT id, verified FROM patient_links
       WHERE id = $1 AND clinic_id = $2`,
      [id, clinicId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "درخواست یافت نشد" });
    }

    if (check.rows[0].verified) {
      return res.status(409).json({
        error: "این درخواست قبلاً تأیید شده و قابل رد نیست",
        code: "ALREADY_VERIFIED",
      });
    }

         // اطلاعات لینک رو قبل از حذف بگیر (برای اعلان)
      const linkInfo = await query(
        `SELECT account_id, patient_id, clinic_id
         FROM patient_links
         WHERE id = $1 AND clinic_id = $2 AND verified = FALSE`,
        [id, clinicId]
      );

      const link = linkInfo.rows[0];

      if (!link) {
        return res.status(409).json({
          error: "درخواست قبلاً بررسی شده یا دیگر قابل رد نیست",
          code: "LINK_ALREADY_PROCESSED",
        });
      }

      const deleted = await query(
        `DELETE FROM patient_links
         WHERE id = $1 AND clinic_id = $2 AND verified = FALSE
         RETURNING id`,
        [id, clinicId]
      );

      if (deleted.rows.length === 0) {
        return res.status(409).json({
          error: "درخواست هم‌زمان بررسی شده است",
          code: "LINK_ALREADY_PROCESSED",
        });
      }

      // ساخت اعلان برای بیمار (اگه اطلاعات داشتیم)
      if (link?.account_id) {
        const clinicInfo = await query(
          `SELECT name FROM clinics WHERE id = $1`,
          [link.clinic_id]
        );

        await createNotification({
          patientAccountId: link.account_id,
          clinicId: link.clinic_id,
          type: "link_rejected",
          title: "درخواست اتصال پرونده رد شد",
          message: `متأسفانه درخواست اتصال شما به پرونده در ${clinicInfo.rows[0]?.name || "کلینیک"} تأیید نشد. برای اطلاعات بیشتر با کلینیک تماس بگیرید.`,
          link: "/patient/my-records",
          metadata: {
            patient_id: link.patient_id,
          },
        });
      }

      res.json({ message: "درخواست اتصال رد و حذف شد" });
  } catch (err) {
    console.error("rejectLink error:", err);
    res.status(500).json({ error: "خطا در رد درخواست" });
  }
}
/* ============================================================ */
/* لیست نوبت‌های بیمار (فقط پرونده‌های تأییدشده)                    */
/* ============================================================ */
export async function listMyAppointments(req, res) {
  const accountId = req.user.account_id;

  try {
    // ⭐ پیدا کردن فقط پرونده‌های متصل به این حساب
    const linksResult = await query(
      `SELECT patient_id FROM patient_links WHERE account_id = $1`,
      [accountId]
    );

    const patientIds = linksResult.rows.map((r) => r.patient_id);
    if (patientIds.length === 0) {
      return res.json({ appointments: [] });
    }

    const { rows } = await query(
      `SELECT 
         a.id, a.appointment_at, a.status, a.notes, a.created_at,
         d.id AS doctor_id, u.full_name AS doctor_name, s.name AS doctor_specialty,
         b.id AS branch_id, b.name AS branch_name, c.id AS clinic_id, c.name AS clinic_name,
         p.id AS patient_id, p.full_name AS patient_name
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN specialties s ON s.id = d.specialty_id
       JOIN branches b ON b.id = a.branch_id
       JOIN clinics c ON c.id = b.clinic_id
       JOIN patients p ON p.id = a.patient_id
       WHERE a.patient_id = ANY($1::int[])
       ORDER BY a.appointment_at DESC`,
      [patientIds]
    );

    res.json({ appointments: rows });
  } catch (err) {
    console.error("listMyAppointments error:", err);
    res.status(500).json({ error: "خطا در دریافت نوبت‌ها" });
  }
}
/* ============================================================ */
/* درخواست نوبت جدید توسط بیمار                                  */
/* ============================================================ */
export async function requestAppointment(req, res) {
  const accountId = req.user.account_id;
  const { patient_id, doctor_id, branch_id, appointment_at, notes } = req.body;

  if (!doctor_id || !branch_id || !appointment_at) {
    return res.status(400).json({
      error: "پزشک، شعبه و زمان نوبت الزامی است",
    });
  }

  try {
    // ۱. گرفتن اطلاعات حساب بیمار
    const accountResult = await query(
      `SELECT id, full_name, phone, national_code FROM patient_accounts WHERE id = $1`,
      [accountId]
    );
    const account = accountResult.rows[0];
    if (!account) {
      return res.status(404).json({ error: "حساب بیمار یافت نشد" });
    }

    // ۲. پیدا کردن کلینیکِ پزشک (از روی شعبه)
    const branchCheck = await query(
      `SELECT b.clinic_id, b.id AS branch_id, c.name AS clinic_name
       FROM branches b
       JOIN clinics c ON c.id = b.clinic_id
       WHERE b.id = $1 AND b.is_active = TRUE`,
      [branch_id]
    );
    if (branchCheck.rows.length === 0) {
      return res.status(404).json({ error: "شعبه یافت نشد یا غیرفعال است" });
    }
    const clinicId = branchCheck.rows[0].clinic_id;

    // ۳. بررسی اینکه پزشک به این شعبه و کلینیک تعلق داره
    const doctorCheck = await query(
      `SELECT d.id FROM doctors d
       JOIN users u ON u.id = d.user_id
       JOIN doctor_branches db ON db.doctor_id = d.id AND db.branch_id = $2
       WHERE d.id = $1 AND u.clinic_id = $3 AND u.is_active = TRUE`,
      [doctor_id, branch_id, clinicId]
    );
    if (doctorCheck.rows.length === 0) {
      return res.status(403).json({ error: "پزشک انتخاب‌شده معتبر نیست" });
    }

    // ۴. ⭐ پیدا کردن یا ساختن پرونده بیمار در این کلینیک
    // ۴. پیدا کردن یا ساختن پرونده بیمار در این کلینیک
    let finalPatientId = null;

    // ⭐ اول چک می‌کنیم آیا این حساب قبلاً به پرونده‌ای در این کلینیک وصل شده
    const linkedRecord = await query(
      `SELECT p.id 
       FROM patient_links pl
       JOIN patients p ON p.id = pl.patient_id
       WHERE pl.account_id = $1 AND p.clinic_id = $2
       LIMIT 1`,
      [accountId, clinicId]
    );

    if (linkedRecord.rows.length > 0) {
      finalPatientId = linkedRecord.rows[0].id;
    } else {
      // ⭐ اگر پرونده‌ای وصل نشده بود، پرونده جدید می‌سازیم
      const newPatient = await query(
        `INSERT INTO patients (full_name, phone, national_code, clinic_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [account.full_name, account.phone, account.national_code, clinicId]
      );
      finalPatientId = newPatient.rows[0].id;

      // ⭐ و اتصال رو در patient_links ثبت می‌کنیم (با verified = TRUE)
      await query(
        `INSERT INTO patient_links (account_id, patient_id, clinic_id, verified, verified_at)
         VALUES ($1, $2, $3, TRUE, NOW())`,
        [accountId, finalPatientId, clinicId]
      );
    }
    // ۵. بررسی اینکه این اسلات قبلاً رزرو نشده
    const conflict = await query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1 AND appointment_at = $2
         AND status IN ('pending', 'booked', 'checked_in', 'in_visit')`,
      [doctor_id, appointment_at]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({
        error: "این زمان قبلاً برای این پزشک رزرو شده است",
        code: "SLOT_TAKEN",
      });
    }

    // ۶. بررسی اینکه بیمار قبلاً برای همین اسلات درخواست نداده
    const dupCheck = await query(
      `SELECT id FROM appointments
       WHERE patient_id = $1 AND doctor_id = $2 AND appointment_at = $3
         AND status = 'pending'`,
      [finalPatientId, doctor_id, appointment_at]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        error: "شما قبلاً برای این زمان درخواست داده‌اید",
        code: "DUPLICATE_REQUEST",
      });
    }

    // ۷. ساخت درخواست نوبت با وضعیت pending
    const { rows } = await query(
      `INSERT INTO appointments 
         (patient_id, doctor_id, branch_id, appointment_at, status, notes, booked_by_patient)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       RETURNING id, status, appointment_at, created_at`,
      [finalPatientId, doctor_id, branch_id, appointment_at, notes || null, accountId]
    );

    // ۸. ساخت اعلان برای منشی‌ها و مدیرها (بدون تغییر)
    try {
      const doctorInfo = await query(
        `SELECT u.full_name FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id = $1`,
        [doctor_id]
      );
      const branchInfo = await query(
        `SELECT name FROM branches WHERE id = $1`,
        [branch_id]
      );

      await createNotificationForRoles({
        clinicId: clinicId,
        roles: ["secretary", "super_admin", "branch_admin"],
        type: "appointment_request",
        title: "درخواست نوبت جدید",
        message: `${account.full_name || "بیمار"} برای دکتر ${doctorInfo.rows[0]?.full_name || ""} در ${branchInfo.rows[0]?.name || ""} درخواست نوبت داده است.`,
        link: "/secretary/patients?tab=appointment-requests",
        metadata: {
          appointment_id: rows[0].id,
          patient_id: finalPatientId,
          doctor_id: doctor_id,
          branch_id: branch_id,
        },
      });
    } catch (notificationError) {
      console.error("Appointment was created, but notification failed:", notificationError);
    }

    res.status(201).json({
      appointment: rows[0],
      message: "درخواست نوبت ارسال شد و در انتظار تأیید منشی است",
    });
  } catch (err) {
    console.error("requestAppointment error:", err);
    res.status(500).json({ error: "خطا در ارسال درخواست نوبت" });
  }
}
/* ============================================================ */
/* ساعت‌های خالی پزشک برای بیمار                                 */
/* GET /api/patient-portal/doctor-slots?doctor_id=X&branch_id=Y&date=Z */
/* ============================================================ */
export async function getDoctorSlots(req, res) {
  const { doctor_id, branch_id, date } = req.query;

  if (!doctor_id || !branch_id || !date) {
    return res.status(400).json({
      error: "پزشک، شعبه و تاریخ الزامی است",
    });
  }

  try {
    // ⭐ حذف چک کردن پرونده بیمار (patient_links)
    // حالا هر بیماری می‌تونه ساعت‌های خالی هر پزشکی رو ببینه

    // بررسی اینکه پزشک، شعبه و تاریخ معتبر هستن
    const doctorCheck = await query(
      `SELECT d.id
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       JOIN doctor_branches db ON db.doctor_id = d.id AND db.branch_id = $2
       JOIN branches b ON b.id = db.branch_id
       WHERE d.id = $1 AND b.is_active = TRUE AND u.is_active = TRUE`,
      [doctor_id, branch_id]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: "پزشک یافت نشد" });
    }

    // برنامه کاری پزشک
    const scheduleResult = await query(
      `SELECT weekday, start_time, end_time, slot_minutes
       FROM doctor_schedules
       WHERE doctor_id = $1 AND branch_id = $2
       ORDER BY weekday`,
      [doctor_id, branch_id]
    );

    const schedule = scheduleResult.rows;

    // نوبت‌های روز (شامل pending)
    const dayApptsResult = await query(
      `SELECT appointment_at, status
       FROM appointments
       WHERE doctor_id = $1 
         AND appointment_at::date = $2::date
         AND status NOT IN ('cancelled', 'rejected', 'no_show')`,
      [doctor_id, date]
    );

    const dayAppts = dayApptsResult.rows;

    // محاسبه ساعت‌های خالی (بدون تغییر)
    const d = new Date(date);
    const jsWeekday = d.getDay();
    const jalaliWeekday = (jsWeekday + 1) % 7;

    const todays = schedule.filter((s) => Number(s.weekday) === jalaliWeekday);

    if (todays.length === 0) {
      return res.json({
        slots: [],
        day_has_schedule: false,
        message: "پزشک در این روز برنامه حضور ندارد",
      });
    }

    const taken = new Set(
      dayAppts.map((a) => new Date(a.appointment_at).toTimeString().slice(0, 5))
    );

    const list = [];
    for (const block of todays) {
      let [h, m] = block.start_time.split(":").map(Number);
      const [endH, endM] = block.end_time.split(":").map(Number);
      while (h < endH || (h === endH && m < endM)) {
        const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        list.push({
          label,
          available: !taken.has(label),
        });
        m += block.slot_minutes;
        while (m >= 60) {
          m -= 60;
          h += 1;
        }
      }
    }

    res.json({
      slots: list,
      day_has_schedule: true,
    });
  } catch (err) {
    console.error("getDoctorSlots error:", err);
    res.status(500).json({ error: "خطا در دریافت ساعت‌های خالی" });
  }
}
/* ============================================================ */
/* روزهای کاری پزشک (برای پنل بیمار)                             */
/* GET /api/patient-portal/doctor-days?doctor_id=X&branch_id=Y   */
/* ============================================================ */
export async function getDoctorDays(req, res) {
  const { doctor_id, branch_id } = req.query;

  if (!doctor_id || !branch_id) {
    return res.status(400).json({ error: "پزشک و شعبه الزامی است" });
  }

  try {
    // ⭐ حذف چک کردن پرونده بیمار (patient_links)
    // حالا هر بیماری می‌تونه برنامه کاری هر پزشکی رو ببینه

    // بررسی اینکه پزشک و شعبه معتبر هستن
    const doctorCheck = await query(
      `SELECT d.id 
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       JOIN doctor_branches db ON db.doctor_id = d.id AND db.branch_id = $2
       JOIN branches b ON b.id = db.branch_id
       WHERE d.id = $1 AND b.is_active = TRUE AND u.is_active = TRUE`,
      [doctor_id, branch_id]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: "پزشک یا شعبه یافت نشد" });
    }

    // دریافت برنامه کاری پزشک
    const scheduleResult = await query(
      `SELECT weekday, start_time, end_time, slot_minutes
       FROM doctor_schedules
       WHERE doctor_id = $1 AND branch_id = $2
       ORDER BY weekday`,
      [doctor_id, branch_id]
    );

    return res.json({
      schedule: scheduleResult.rows,
    });
  } catch (err) {
    console.error("getDoctorDays error:", err);
    return res.status(500).json({ error: "خطا در دریافت روزهای کاری" });
  }
}
export async function listPatientDoctors(req, res) {
  const { clinic_id, specialty_id, q } = req.query;

  try {
    // ساخت شرط‌ها
    const conditions = [`u.is_active = TRUE`];
    const params = [];

    if (clinic_id) {
      params.push(clinic_id);
      conditions.push(`c.id = $${params.length}`);
    }

    if (specialty_id) {
      params.push(specialty_id);
      conditions.push(`d.specialty_id = $${params.length}`);
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

          // اضافه کردن پارامتر account_id به params
      const accountId = req.user?.account_id;
      params.push(accountId || 0);
      const accountParam = `$${params.length}`;

      const { rows: doctors } = await query(
        `SELECT DISTINCT
           d.id,
           d.user_id,
           d.specialty_id,
           u.full_name,
           u.phone,
           s.name AS specialty,
           db.branch_id,
           b.name AS branch_name,
           b.address AS branch_address,
           b.phone AS branch_phone,
           c.id AS clinic_id,
           c.name AS clinic_name,
           EXISTS (
             SELECT 1 FROM favorite_doctors fd
             WHERE fd.patient_account_id = ${accountParam} AND fd.doctor_id = d.id
           ) AS is_favorite
         FROM doctors d
         JOIN users u ON u.id = d.user_id
         LEFT JOIN specialties s ON s.id = d.specialty_id
         JOIN doctor_branches db ON db.doctor_id = d.id
         JOIN branches b ON b.id = db.branch_id
         JOIN clinics c ON c.id = b.clinic_id
         ${where}
         ORDER BY is_favorite DESC, u.full_name`,
        params
      );

    // لیست کلینیک‌ها و تخصص‌ها برای فیلتر (از همه پزشکان)
    const { rows: clinics } = await query(
      `SELECT DISTINCT c.id, c.name
       FROM clinics c
       JOIN branches b ON b.clinic_id = c.id
       JOIN doctor_branches db ON db.branch_id = b.id
       JOIN doctors d ON d.id = db.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE u.is_active = TRUE
       ORDER BY c.name`
    );

    const { rows: specialties } = await query(
      `SELECT DISTINCT s.id, s.name
       FROM specialties s
       JOIN doctors d ON d.specialty_id = s.id
       JOIN users u ON u.id = d.user_id
       WHERE u.is_active = TRUE
       ORDER BY s.name`
    );

    res.json({ doctors, clinics, specialties });
  } catch (err) {
    console.error("listPatientDoctors error:", err);
    res.status(500).json({ error: "خطا در دریافت پزشکان" });
  }
}
/* ============================================================ */
/* دریافت پروفایل بیمار (اطلاعات حساب)                          */
/* ============================================================ */
export async function getMyProfile(req, res) {
  const accountId = req.user.account_id;

  try {
    const { rows } = await query(
      `SELECT id, full_name, phone, national_code, is_active, last_login, created_at
       FROM patient_accounts
       WHERE id = $1`,
      [accountId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "پروفایل یافت نشد" });
    }

    res.json({ profile: rows[0] });
  } catch (err) {
    console.error("getMyProfile error:", err);
    res.status(500).json({ error: "خطا در دریافت پروفایل" });
  }
}

/* ============================================================ */
/* ویرایش پروفایل بیمار (نام و ایمیل)                            */
/* ============================================================ */
export async function updateMyProfile(req, res) {
  const accountId = req.user.account_id;
  const { full_name, email } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: "نام و نام خانوادگی الزامی است" });
  }

  try {
    // بررسی ایمیل تکراری
    if (email && email.trim()) {
      const dupCheck = await query(
        `SELECT id FROM patient_accounts WHERE email = $1 AND id <> $2`,
        [email.trim(), accountId]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          error: "این ایمیل قبلاً ثبت شده است",
          code: "DUPLICATE_EMAIL",
        });
      }
    }

    const { rows } = await query(
      `UPDATE patient_accounts
       SET full_name = $1, email = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, full_name, phone, national_code, email`,
      [full_name.trim(), email?.trim() || null, accountId]
    );

    res.json({
      profile: rows[0],
      message: "پروفایل با موفقیت بروزرسانی شد",
    });
  } catch (err) {
    console.error("updateMyProfile error:", err);
    res.status(500).json({ error: "خطا در بروزرسانی پروفایل" });
  }
}
/* ============================================================ */
/* لیست نسخه‌های بیمار (فقط پرونده‌های تأییدشده)                  */
/* ============================================================ */
export async function listMyPrescriptions(req, res) {
  const accountId = req.user.account_id;
  if (!accountId) {
    return res.status(403).json({ error: "حساب بیمار یافت نشد" });
  }

  try {
    const linksResult = await query(
      `SELECT patient_id, clinic_id FROM patient_links
       WHERE account_id = $1 AND verified = TRUE`,
      [accountId]
    );

    const patientIds = linksResult.rows.map((r) => r.patient_id);
    if (patientIds.length === 0) {
      return res.json({ prescriptions: [] });
    }

              const { rows } = await query(
        `SELECT
           p.id,
           p.medicine,
           p.dosage,
           p.duration,
           p.notes,
           v.id AS visit_id,
           v.diagnosis,
           v.treatment_plan,
           v.created_at AS visit_date,
           d.id AS doctor_id,
           u.full_name AS doctor_name,
           s.name AS doctor_specialty,
           pt.clinic_id AS clinic_id,
           c.name AS clinic_name,
           COALESCE(b.id, 0) AS branch_id,
           COALESCE(b.name, '—') AS branch_name,
           pt.id AS patient_id,
           pt.full_name AS patient_name
         FROM prescriptions p
         JOIN visits v ON v.id = p.visit_id
         JOIN doctors d ON d.id = v.doctor_id
         JOIN users u ON u.id = d.user_id
         LEFT JOIN specialties s ON s.id = d.specialty_id
         JOIN patients pt ON pt.id = v.patient_id
         LEFT JOIN clinics c ON c.id = pt.clinic_id
         LEFT JOIN appointments a ON a.id = v.appointment_id
         LEFT JOIN branches b ON b.id = a.branch_id
         WHERE v.patient_id = ANY($1::int[])
         ORDER BY v.created_at DESC, p.id`,
        [patientIds]
      );

    res.json({ prescriptions: rows });
  } catch (err) {
    console.error("listMyPrescriptions error:", err);
    res.status(500).json({ error: "خطا در دریافت نسخه‌ها" });
  }
}

/* ============================================================ */
/* لیست فاکتورهای بیمار (فقط پرونده‌های تأییدشده)                 */
/* ============================================================ */
export async function listMyInvoices(req, res) {
  const accountId = req.user.account_id;
  if (!accountId) {
    return res.status(403).json({ error: "حساب بیمار یافت نشد" });
  }

  try {
    const linksResult = await query(
      `SELECT patient_id, clinic_id FROM patient_links
       WHERE account_id = $1 AND verified = TRUE`,
      [accountId]
    );

    const patientIds = linksResult.rows.map((r) => r.patient_id);
    if (patientIds.length === 0) {
      return res.json({ invoices: [], totals: { total: 0, paid: 0, outstanding: 0 } });
    }

    const { rows } = await query(
      `SELECT
         i.id,
         i.total_amount,
         i.created_at,
         i.visit_id,
         COALESCE(SUM(pay.amount), 0)::numeric AS paid_amount,
         (i.total_amount - COALESCE(SUM(pay.amount), 0))::numeric AS outstanding_amount,
         b.id AS branch_id,
         b.name AS branch_name,
         c.id AS clinic_id,
         c.name AS clinic_name,
         pt.id AS patient_id,
         pt.full_name AS patient_name,
         ins.name AS insurer_name,
         (SELECT json_agg(json_build_object(
           'id', pay.id,
           'amount', pay.amount,
           'method', pay.method,
           'paid_at', pay.paid_at
         ) ORDER BY pay.paid_at)
          FROM payments pay WHERE pay.invoice_id = i.id) AS payments
              FROM invoices i
       JOIN patients pt ON pt.id = i.patient_id
       JOIN branches b ON b.id = i.branch_id
       JOIN clinics c ON c.id = b.clinic_id
       LEFT JOIN insurers ins ON ins.id = i.insurer_id
       LEFT JOIN payments pay ON pay.invoice_id = i.id
       WHERE i.patient_id = ANY($1::int[])
       GROUP BY i.id, b.id, c.id, pt.id, ins.name
       ORDER BY i.created_at DESC`,
      [patientIds]
    );

    const totals = {
      total: rows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      paid: rows.reduce((s, r) => s + Number(r.paid_amount || 0), 0),
      outstanding: rows.reduce((s, r) => s + Number(r.outstanding_amount || 0), 0),
    };

    res.json({ invoices: rows, totals });
  } catch (err) {
    console.error("listMyInvoices error:", err);
    res.status(500).json({ error: "خطا در دریافت فاکتورها" });
  }
}