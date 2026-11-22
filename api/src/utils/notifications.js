import { query } from "../db.js";

/**
 * ساخت یه اعلان داخل نرم‌افزار
 *
 * @param {Object} opts
 * @param {number|null} opts.userId - گیرنده کاربر کلینیک (اگه منشی/پزشک/مدیر)
 * @param {number|null} opts.patientAccountId - گیرنده بیمار (اگه بیمار)
 * @param {number} opts.clinicId - کلینیک مربوطه
 * @param {string} opts.type - نوع: appointment_request | link_request | appointment_confirmed | ...
 * @param {string} opts.title - عنوان
 * @param {string} opts.message - متن
 * @param {string|null} opts.link - لینک (اختیاری)
 * @param {Object|null} opts.metadata - داده‌ی اضافی
 */
export async function createNotification({
  userId = null,
  patientAccountId = null,
  clinicId,
  type,
  title,
  message,
  link = null,
  metadata = null,
}) {
  if (!userId && !patientAccountId) {
    throw new Error("اعلان باید یا user_id یا patient_account_id داشته باشد");
  }
  if (userId && patientAccountId) {
    throw new Error("اعلان نمی‌تواند هم user_id و هم patient_account_id داشته باشد");
  }
  if (!clinicId) {
    throw new Error("clinic_id الزامی است");
  }

  try {
    const { rows } = await query(
      `INSERT INTO app_notifications
         (user_id, patient_account_id, clinic_id, type, title, message, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        patientAccountId,
        clinicId,
        type,
        title,
        message,
        link,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
    return rows[0];
  } catch (err) {
    // اعلان نباید باعث خطای اصلی بشه
    console.error("خطا در ساخت اعلان:", err.message);
    return null;
  }
}

/**
 * ساخت اعلان برای همه‌ی کاربران یه نقش توی یه کلینیک (مثلاً همه‌ی منشی‌ها)
 */
export async function createNotificationForRole({
  clinicId,
  role,
  type,
  title,
  message,
  link = null,
  metadata = null,
}) {
  try {
    const { rows: users } = await query(
      `SELECT id FROM users
       WHERE clinic_id = $1 AND role = $2 AND is_active = TRUE`,
      [clinicId, role]
    );

    const results = [];
    for (const u of users) {
      const r = await createNotification({
        userId: u.id,
        clinicId,
        type,
        title,
        message,
        link,
        metadata,
      });
      if (r) results.push(r);
    }
    return results;
  } catch (err) {
    console.error("خطا در ساخت اعلان گروهی:", err.message);
    return [];
  }
}
/**
 * ساخت اعلان برای چند نقش مختلف توی یه کلینیک (مثلاً منشی‌ها + مدیرها)
 */
export async function createNotificationForRoles({
  clinicId,
  roles,
  type,
  title,
  message,
  link = null,
  metadata = null,
}) {
  try {
    // نقش‌ها رو به صورت پارامترهای جدا می‌فرستیم (چون role یه enum هست، نه text)
    const placeholders = roles.map((_, i) => `$${i + 2}`).join(", ");
    const queryText = `
      SELECT id FROM users
      WHERE clinic_id = $1 AND role::text IN (${placeholders}) AND is_active = TRUE
    `;
    const params = [clinicId, ...roles];

    const { rows: users } = await query(queryText, params);

    const results = [];
    for (const u of users) {
      const r = await createNotification({
        userId: u.id,
        clinicId,
        type,
        title,
        message,
        link,
        metadata,
      });
      if (r) results.push(r);
    }
    return results;
  } catch (err) {
    console.error("خطا در ساخت اعلان چندنقشه:", err.message);
    return [];
  }
}