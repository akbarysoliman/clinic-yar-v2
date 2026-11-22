/* ---------------------------------------------------------------------- */
/* Jalali (Persian) calendar conversion — standard algorithm, no library   */
/* ---------------------------------------------------------------------- */
function div(a, b) { return Math.floor(a / b); }

export function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 + 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) +
    div(gy2 + 399, 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + div(days, 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + div(days - 186, 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy0, jm, jd) {
  let jy = jy0 + 1595;
  let days =
    -355668 + 365 * jy + div(jy, 33) * 8 + div(((jy % 33) + 3), 4) + jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12; gm++) {
    if (gd <= sal[gm]) break;
    gd -= sal[gm];
  }
  return { gy, gm, gd };
}

export function daysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const g = jalaliToGregorian(jy, 12, 30);
  const back = gregorianToJalali(g.gy, g.gm, g.gd);
  return back.jm === 12 && back.jd === 30 ? 30 : 29;
}

export const J_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export const WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
export const WEEKDAYS_FULL = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

export function toFa(input) {
  const map = { 0: "۰", 1: "۱", 2: "۲", 3: "۳", 4: "۴", 5: "۵", 6: "۶", 7: "۷", 8: "۸", 9: "۹" };
  return String(input).replace(/[0-9]/g, (d) => map[d]);
}

export function todayJalali() {
  const n = new Date();
  return gregorianToJalali(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

export function jalaliLabel(j, withWeekday) {
  const g = jalaliToGregorian(j.jy, j.jm, j.jd);
  const wd = WEEKDAYS_FULL[new Date(g.gy, g.gm - 1, g.gd).getDay()];
  const base = `${toFa(j.jd)} ${J_MONTHS[j.jm - 1]} ${toFa(j.jy)}`;
  return withWeekday ? `${wd} ${base}` : base;
}

/** جالالی + ساعت "HH:MM" را به Date میلادی واقعی تبدیل می‌کند (برای ارسال به API) */
export function jalaliToDate(j, timeLabel) {
  const g = jalaliToGregorian(j.jy, j.jm, j.jd);
  const [h, m] = timeLabel.split(":").map(Number);
  return new Date(g.gy, g.gm - 1, g.gd, h, m, 0);
}

/** اندیس روز هفته به سبک doctor_schedules (۰=شنبه ... ۶=جمعه) برای یک تاریخ جلالی */
export function jalaliWeekdayIndex(j) {
  const g = jalaliToGregorian(j.jy, j.jm, j.jd);
  return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
}
