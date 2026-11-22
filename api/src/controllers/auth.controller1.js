import jwt from "jsonwebtoken";
import { isValidIranianNationalCode } from "../utils/nationalCode.js";
import fetch from "node-fetch";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { getInstallationIdentity } from "../utils/installationIdentity.js";

async function validateCentralLicense({
  licenseKey,
  companyCode,
  softwareCode,
  installationIdentity,
}) {
  const ssoServerUrl = (
    process.env.SSO_SERVER_URL || "http://localhost:5001/api"
  ).replace(/\/$/, "");

  const apiKey = process.env.SSO_API_KEY;

  if (!apiKey) {
    throw new Error("SSO_API_KEY تنظیم نشده است");
  }

  const response = await fetch(`${ssoServerUrl}/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      license_key: licenseKey,
      software_code: softwareCode,
      company_code: companyCode,
      installation_id: installationIdentity.installation_id,
      device_fingerprint: installationIdentity.device_fingerprint,
      app_version: "clinic-web-1.0.0",
      client_time: new Date().toISOString(),
    }),
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.valid) {
    const error = new Error(
      data?.error || "لایسنس معتبر نیست"
    );

    error.code = data?.code || "LICENSE_VALIDATION_FAILED";
    error.status = response.status;

    throw error;
  }

  return data;
}

export async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "نام کاربری و رمز عبور الزامی است",
    });
  }

  const ssoServerUrl = (
    process.env.SSO_SERVER_URL || "http://localhost:5001/api"
  ).replace(/\/$/, "");

  const softwareCode =
    process.env.SSO_SOFTWARE_CODE || "clinic-management";

  try {
    const installationIdentity = getInstallationIdentity();

    // =========================================================
    // 1. ابتدا کاربر محلی را پیدا می‌کنیم (پزشک / منشی)
    // =========================================================
    const { rows } = await query(
      `SELECT
          id, clinic_id, full_name, username, phone, email,
          password_hash, role, branch_id, is_active, license_user_code
       FROM users
       WHERE username = $1 OR phone = $1 OR license_user_code = $1
       LIMIT 1`,
      [username]
    );

    const localUser = rows[0];

    // =========================================================
    // 2. اگر کاربر محلی پیدا شد و پزشک/منشی بود، از رمز محلی استفاده کن
    // =========================================================
    if (localUser && localUser.role !== "super_admin") {
      if (!localUser.is_active) {
        return res.status(403).json({ error: "حساب کاربری غیرفعال است", code: "LOCAL_USER_INACTIVE" });
      }
      if (!localUser.password_hash) {
        return res.status(401).json({ error: "رمز عبور ثبت نشده است", code: "LOCAL_PASSWORD_NOT_SET" });
      }

      const passwordMatch = await bcrypt.compare(password, localUser.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است", code: "INVALID_CREDENTIALS" });
      }

      const clinicResult = await query(
        `SELECT company_code, license_key FROM clinics WHERE id = $1`,
        [localUser.clinic_id]
      );
      const clinic = clinicResult.rows[0];
      if (!clinic) return res.status(403).json({ error: "کلینیک یافت نشد" });

      await validateCentralLicense({
        licenseKey: clinic.license_key,
        companyCode: clinic.company_code,
        softwareCode,
        installationIdentity,
      });

      const payload = {
        id: localUser.id,
        clinic_id: localUser.clinic_id,
        full_name: localUser.full_name,
        role: localUser.role,
        branch_id: localUser.branch_id,
        license_user_code: localUser.license_user_code || null,
        license_key: clinic.license_key,
        company_code: clinic.company_code,
        software_code: softwareCode,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      });

      return res.json({ token, user: payload });
    }

    // =========================================================
    // 3. در غیر این صورت (کاربر ادمین یا کاربر جدید)، از SSO اعتبارسنجی کن
    // =========================================================
    const companyCode = process.env.SSO_COMPANY_CODE;

    if (!companyCode) {
      return res.status(500).json({
        error: "تنظیمات اتصال به سرور لایسنس کامل نیست (کد شرکت نامشخص)",
      });
    }

    const ssoResponse = await fetch(`${ssoServerUrl}/sso/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_code: username,
        password,
        company_code: companyCode,
        software_code: softwareCode,
        installation_id: installationIdentity.installation_id,
        device_fingerprint: installationIdentity.device_fingerprint,
        app_version: "clinic-web-1.0.0",
        client_time: new Date().toISOString(),
      }),
    });

    let ssoData = null;
    try { ssoData = await ssoResponse.json(); } catch { ssoData = null; }

    if (!ssoResponse.ok || !ssoData?.success) {
      return res.status(
        ssoResponse.status >= 400 && ssoResponse.status < 500
          ? ssoResponse.status
          : 401
      ).json({
        error: ssoData?.error || "نام کاربری یا رمز عبور اشتباه است",
        code: ssoData?.code || "SSO_LOGIN_FAILED",
      });
    }

    const centralUser = ssoData.user;
    const customer = ssoData.customer;
    const license = ssoData.license;

    if (!centralUser?.user_code || !customer?.id) {
      return res.status(401).json({
        error: "اطلاعات کاربر از سرور لایسنس ناقص است",
        code: "SSO_USER_DATA_INVALID",
      });
    }

    // =========================================================
    // 4. ساخت JWT (بدون هیچ کاری با دیتابیس PostgreSQL)
    // =========================================================
    const payload = {
      id: centralUser.id,
      clinic_id: customer.id,
      full_name: centralUser.name,
      role: centralUser.role === "customer_admin" ? "super_admin" : "branch_admin",
      branch_id: null,
      license_user_code: centralUser.user_code,
      license_key: license?.key || null,
      company_code: customer.code,
      software_code: softwareCode,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });

    return res.json({ token, user: payload });
  } catch (error) {
    console.error("خطا در ورود:", error);
    return res.status(503).json({ error: "خطا در ارتباط با سرویس احراز هویت", code: "AUTH_SERVICE_ERROR" });
  }
}
export async function me(req, res) {
  res.json({
    user: req.user,
  });
}
/* ============================================================ */
/* ورود / ثبت‌نام بیمار (بدون رمز، با شماره موبایل + کد ملی)      */
/* ============================================================ */
/* ============================================================ */
/* ورود / ثبت‌نام بیمار (با شماره موبایل + کد ملی)                */
/* جدا از پرونده بیمار — حساب در patient_accounts ذخیره می‌شود    */
/* ============================================================ */
export async function patientLogin(req, res) {
  const { phone, national_code, full_name } = req.body;

  if (!phone || !national_code) {
    return res.status(400).json({ error: "شماره موبایل و کد ملی الزامی است" });
  }

  const cleanPhone = String(phone).trim();
  const cleanCode = String(national_code).trim();

  if (!/^09\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ error: "شماره موبایل نامعتبر است" });
  }
  if (!isValidIranianNationalCode(cleanCode)) {
    return res.status(400).json({ error: "کد ملی نامعتبر است؛ لطفاً کد ملی ۱۰ رقمی معتبر وارد کنید" });
  }

  try {
    const existing = await query(
      `SELECT id, full_name, phone, national_code, is_active
       FROM patient_accounts
       WHERE phone = $1
       LIMIT 1`,
      [cleanPhone]
    );

    let account;

    if (existing.rows.length > 0) {
      account = existing.rows[0];

      if (!account.is_active) {
        return res.status(403).json({
          error: "حساب کاربری غیرفعال است",
          code: "ACCOUNT_INACTIVE",
        });
      }

      if (account.national_code && account.national_code !== cleanCode) {
        return res.status(403).json({
          error: "کد ملی با شماره موبایل ثبت‌شده مطابقت ندارد",
          code: "NATIONAL_CODE_MISMATCH",
        });
      }
    } else {
      if (!full_name || !full_name.trim()) {
        return res.status(400).json({
          error: "برای ثبت‌نام جدید، نام کامل الزامی است",
          code: "NEED_FULL_NAME",
        });
      }

      const inserted = await query(
        `INSERT INTO patient_accounts (phone, full_name, national_code)
         VALUES ($1, $2, $3)
         RETURNING id, full_name, phone, national_code, is_active`,
        [cleanPhone, full_name.trim(), cleanCode]
      );

      account = inserted.rows[0];
    }

    await query(
      `UPDATE patient_accounts SET last_login = NOW() WHERE id = $1`,
      [account.id]
    );

    const payload = {
      account_id: account.id,
      full_name: account.full_name,
      phone: account.phone,
      role: "patient",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });

    return res.json({ token, account: payload });
  } catch (err) {
    console.error("Patient login error:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "این شماره موبایل قبلاً ثبت شده است",
        code: "DUPLICATE_PHONE",
      });
    }

    return res.status(500).json({ error: "خطا در ورود بیمار" });
  }
}    
/* ============================================================ */
/* تغییر رمز عبور کاربر (منشی، پزشک، مدیر)                       */
/* ============================================================ */
export async function changePassword(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "کاربر احراز هویت نشده است" });
  }

  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      error: "رمز عبور فعلی و رمز عبور جدید الزامی است",
    });
  }

  if (new_password.length < 8) {
    return res.status(400).json({
      error: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد",
    });
  }

  if (current_password === new_password) {
    return res.status(400).json({
      error: "رمز عبور جدید باید با رمز فعلی متفاوت باشد",
    });
  }

  try {
    // پیدا کردن کاربر
    const userResult = await query(
      `SELECT id, password_hash, role FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    const user = userResult.rows[0];

    // بررسی رمز فعلی
    if (!user.password_hash) {
      return res.status(400).json({
        error: "این حساب رمز عبور ندارد",
        code: "NO_PASSWORD_SET",
      });
    }

    const passwordMatch = await bcrypt.compare(
      current_password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "رمز عبور فعلی اشتباه است",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }

    // هش کردن رمز جدید
    const newHash = await bcrypt.hash(new_password, 10);

    // بروزرسانی
    await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newHash, userId]
    );

    res.json({ message: "رمز عبور با موفقیت تغییر کرد" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ error: "خطا در تغییر رمز عبور" });
  }
}

