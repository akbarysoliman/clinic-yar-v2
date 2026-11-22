import { query } from "../db.js";

/**
 * لیست پزشکان مورد علاقه بیمار
 */
export async function listFavorites(req, res) {
  const accountId = req.user?.account_id;
  if (!accountId) {
    return res.status(403).json({ error: "حساب بیمار یافت نشد" });
  }

  try {
    const { rows } = await query(
      `SELECT
         fd.id AS favorite_id,
         d.id AS doctor_id,
         u.full_name AS doctor_name,
         s.name AS specialty,
         db.branch_id,
         b.name AS branch_name,
         c.id AS clinic_id,
         c.name AS clinic_name
       FROM favorite_doctors fd
       JOIN doctors d ON d.id = fd.doctor_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN specialties s ON s.id = d.specialty_id
       JOIN doctor_branches db ON db.doctor_id = d.id
       JOIN branches b ON b.id = db.branch_id
       JOIN clinics c ON c.id = b.clinic_id
       WHERE fd.patient_account_id = $1
         AND u.is_active = TRUE
       ORDER BY fd.created_at DESC`,
      [accountId]
    );

    res.json({ favorites: rows });
  } catch (err) {
    console.error("listFavorites error:", err);
    res.status(500).json({ error: "خطا در دریافت پزشکان مورد علاقه" });
  }
}

/**
 * افزودن پزشک به علاقه‌مندی‌ها
 */
export async function addFavorite(req, res) {
  const accountId = req.user?.account_id;
  const { doctor_id } = req.body;

  if (!accountId) {
    return res.status(403).json({ error: "حساب بیمار یافت نشد" });
  }
  if (!doctor_id) {
    return res.status(400).json({ error: "شناسه پزشک الزامی است" });
  }

  try {
    // چک کن پزشک وجود داره و فعاله
    const doctorCheck = await query(
      `SELECT d.id FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = $1 AND u.is_active = TRUE`,
      [doctor_id]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: "پزشک یافت نشد" });
    }

    await query(
      `INSERT INTO favorite_doctors (patient_account_id, doctor_id)
       VALUES ($1, $2)
       ON CONFLICT (patient_account_id, doctor_id) DO NOTHING`,
      [accountId, doctor_id]
    );

    res.status(201).json({ success: true, message: "پزشک به علاقه‌مندی‌ها اضافه شد" });
  } catch (err) {
    console.error("addFavorite error:", err);
    res.status(500).json({ error: "خطا در افزودن پزشک به علاقه‌مندی" });
  }
}

/**
 * حذف پزشک از علاقه‌مندی‌ها
 */
export async function removeFavorite(req, res) {
  const accountId = req.user?.account_id;
  const { doctor_id } = req.params;

  if (!accountId) {
    return res.status(403).json({ error: "حساب بیمار یافت نشد" });
  }

  try {
    const { rowCount } = await query(
      `DELETE FROM favorite_doctors
       WHERE patient_account_id = $1 AND doctor_id = $2`,
      [accountId, doctor_id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "این پزشک در علاقه‌مندی‌ها نیست" });
    }

    res.json({ success: true, message: "پزشک از علاقه‌مندی‌ها حذف شد" });
  } catch (err) {
    console.error("removeFavorite error:", err);
    res.status(500).json({ error: "خطا در حذف پزشک از علاقه‌مندی" });
  }
}