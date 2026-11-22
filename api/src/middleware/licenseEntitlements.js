import fetch from "node-fetch";
import { getInstallationIdentity } from "../utils/installationIdentity.js";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 دقیقه

let licenseCache = {
  key: null,
  data: null,
  expiresAt: 0,
};

function getLicenseKey(req) {
  return (
    req.user?.license_key ||
    req.user?.licenseKey ||
    null
  );
}

export async function loadLicenseEntitlements(req, res, next) {
  const licenseKey = getLicenseKey(req);

  if (!licenseKey) {
    return res.status(403).json({
      error: "اطلاعات لایسنس کاربر موجود نیست",
      code: "LICENSE_KEY_MISSING",
    });
  }

  const now = Date.now();

  // استفاده از Cache برای جلوگیری از درخواست به سرور مرکزی در هر API call
  if (
    licenseCache.key === licenseKey &&
    licenseCache.data &&
    licenseCache.expiresAt > now
  ) {
    req.license = licenseCache.data;
    return next();
  }

  const licenseServerUrl = (
    process.env.SSO_SERVER_URL || "http://localhost:5001/api"
  ).replace(/\/$/, "");

const apiKey = process.env.SSO_API_KEY;
  if (!apiKey) {
    console.error("LICENSE_API_KEY تنظیم نشده است");

    return res.status(500).json({
      error: "تنظیمات اتصال به سرور لایسنس کامل نیست",
      code: "LICENSE_API_KEY_MISSING",
    });
  }

  try {
const installationIdentity = getInstallationIdentity();

const response = await fetch(`${licenseServerUrl}/validate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  },
  body: JSON.stringify({
    license_key: licenseKey,
software_code:req.user?.software_code || "clinic-management",
    company_code: req.user?.company_code || undefined,
    installation_id: installationIdentity.installation_id,
    device_fingerprint: installationIdentity.device_fingerprint,
    app_version: "clinic-api-1.0.0",
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
      return res.status(
        response.status >= 400 && response.status < 500
          ? response.status
          : 503
      ).json({
        error: data?.error || "لایسنس معتبر نیست",
        code: data?.code || "LICENSE_VALIDATION_FAILED",
      });
    }

    // Cache فقط نتیجه معتبر
    licenseCache = {
      key: licenseKey,
      data,
      expiresAt: now + CACHE_TTL_MS,
    };

    req.license = data;

    next();
  } catch (error) {
    console.error("خطا در اعتبارسنجی لایسنس:", error);

    return res.status(503).json({
      error: "ارتباط با سرور لایسنس برقرار نشد",
      code: "LICENSE_SERVER_UNAVAILABLE",
    });
  }
}