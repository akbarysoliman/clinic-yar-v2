import jwt from "jsonwebtoken";

/**
 * توکن JWT را از هدر Authorization می‌خواند و اعتبارسنجی می‌کند.
 * در صورت موفقیت، اطلاعات کاربر (id, role, branch_id) را روی req.user قرار می‌دهد.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "توکن ورود ارسال نشده است" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, branch_id, full_name }
    next();
  } catch (err) {
    return res.status(401).json({ error: "توکن نامعتبر یا منقضی‌شده است" });
  }
}

/**
 * محدودکردن یک مسیر به لیستی از نقش‌های مجاز.
 * استفاده: requireRole('super_admin', 'branch_admin')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "ابتدا وارد سیستم شوید" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "شما به این بخش دسترسی ندارید" });
    }
    next();
  };
}

/**
 * محدودکردن نتایج به شعبه‌ی خود کاربر — مگر اینکه super_admin باشد.
 * این تابع branch_id مجاز را برمی‌گرداند (یا null اگر کاربر به همه شعبه‌ها دسترسی دارد).
 */
export function effectiveBranchId(req) {
  if (req.user.role === "super_admin") return null;
  return req.user.branch_id;
}
