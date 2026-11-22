const attempts = new Map(); // key: phone+ip -> { count, firstAttemptAt }

const WINDOW_MS = 15 * 60 * 1000; // ۱۵ دقیقه
const MAX_ATTEMPTS = 8;

/**
 * جلوگیری ساده از حدس‌زدن رمز عبور: بعد از ۸ تلاش ناموفق برای یک شماره تماس
 * در بازه ۱۵ دقیقه‌ای، درخواست‌های بعدی رد می‌شوند.
 * برای مقیاس بزرگ (چند سرور) باید این حافظه به Redis منتقل شود؛ برای یک سرور کافی است.
 */
export function loginRateLimit(req, res, next) {
  const key = `${req.body?.phone || "unknown"}:${req.ip}`;
  const now = Date.now();
  const record = attempts.get(key);

  if (record && now - record.firstAttemptAt < WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: "تعداد تلاش‌های ورود بیش از حد مجاز است. چند دقیقه دیگر دوباره امتحان کنید." });
  }

  res.on("finish", () => {
    if (res.statusCode === 401) {
      if (record && now - record.firstAttemptAt < WINDOW_MS) {
        record.count += 1;
      } else {
        attempts.set(key, { count: 1, firstAttemptAt: now });
      }
    } else if (res.statusCode === 200) {
      attempts.delete(key);
    }
  });

  next();
}
