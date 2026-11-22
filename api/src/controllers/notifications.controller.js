import { query } from "../db.js";

/**
 * لیست اعلان‌های کاربر جاری
 */
export async function listMyNotifications(req, res) {
  const userId = req.user?.id;
  const patientAccountId = req.user?.account_id;

  if (!userId && !patientAccountId) {
    return res.status(403).json({ error: "کاربر احراز هویت نشده است" });
  }

  try {
    const params = [];
    let whereClause;

    if (userId) {
      params.push(userId);
      whereClause = `user_id = $${params.length}`;
    } else {
      params.push(patientAccountId);
      whereClause = `patient_account_id = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT id, type, title, message, link, metadata, is_read, read_at, created_at
       FROM app_notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS unread_count
       FROM app_notifications
       WHERE ${whereClause} AND is_read = FALSE`,
      params
    );

    res.json({
      notifications: rows,
      unread_count: countRows[0]?.unread_count || 0,
    });
  } catch (err) {
    console.error("listMyNotifications error:", err);
    res.status(500).json({ error: "خطا در دریافت اعلان‌ها" });
  }
}

/**
 * تعداد اعلان‌های خوانده‌نشده (برای badge)
 */
export async function getUnreadCount(req, res) {
  const userId = req.user?.id;
  const patientAccountId = req.user?.account_id;

  if (!userId && !patientAccountId) {
    return res.status(403).json({ error: "کاربر احراز هویت نشده است" });
  }

  try {
    let whereClause;
    const params = [];

    if (userId) {
      params.push(userId);
      whereClause = `user_id = $${params.length}`;
    } else {
      params.push(patientAccountId);
      whereClause = `patient_account_id = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT COUNT(*)::int AS unread_count
       FROM app_notifications
       WHERE ${whereClause} AND is_read = FALSE`,
      params
    );

    res.json({ unread_count: rows[0]?.unread_count || 0 });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    res.status(500).json({ error: "خطا در شمارش اعلان‌ها" });
  }
}

/**
 * علامت‌گذاری یه اعلان به‌عنوان خوانده‌شده
 */
export async function markAsRead(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const patientAccountId = req.user?.account_id;

  if (!userId && !patientAccountId) {
    return res.status(403).json({ error: "کاربر احراز هویت نشده است" });
  }

  try {
    const params = [id];
    let extraWhere;

    if (userId) {
      params.push(userId);
      extraWhere = `AND user_id = $${params.length}`;
    } else {
      params.push(patientAccountId);
      extraWhere = `AND patient_account_id = $${params.length}`;
    }

    const { rows } = await query(
      `UPDATE app_notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 ${extraWhere}
       RETURNING id, is_read, read_at`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "اعلان یافت نشد" });
    }

    res.json({ notification: rows[0] });
  } catch (err) {
    console.error("markAsRead error:", err);
    res.status(500).json({ error: "خطا در علامت‌گذاری اعلان" });
  }
}

/**
 * علامت‌گذاری همه‌ی اعلان‌ها به‌عنوان خوانده‌شده
 */
export async function markAllAsRead(req, res) {
  const userId = req.user?.id;
  const patientAccountId = req.user?.account_id;

  if (!userId && !patientAccountId) {
    return res.status(403).json({ error: "کاربر احراز هویت نشده است" });
  }

  try {
    const params = [];
    let whereClause;

    if (userId) {
      params.push(userId);
      whereClause = `user_id = $${params.length}`;
    } else {
      params.push(patientAccountId);
      whereClause = `patient_account_id = $${params.length}`;
    }

    const { rowCount } = await query(
      `UPDATE app_notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE ${whereClause} AND is_read = FALSE`,
      params
    );

    res.json({ updated_count: rowCount });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    res.status(500).json({ error: "خطا در علامت‌گذاری اعلان‌ها" });
  }
}

/**
 * حذف یه اعلان
 */
export async function deleteNotification(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const patientAccountId = req.user?.account_id;

  if (!userId && !patientAccountId) {
    return res.status(403).json({ error: "کاربر احراز هویت نشده است" });
  }

  try {
    const params = [id];
    let extraWhere;

    if (userId) {
      params.push(userId);
      extraWhere = `AND user_id = $${params.length}`;
    } else {
      params.push(patientAccountId);
      extraWhere = `AND patient_account_id = $${params.length}`;
    }

    const { rowCount } = await query(
      `DELETE FROM app_notifications
       WHERE id = $1 ${extraWhere}`,
      params
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "اعلان یافت نشد" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("deleteNotification error:", err);
    res.status(500).json({ error: "خطا در حذف اعلان" });
  }
}