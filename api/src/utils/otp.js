import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60;

export function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(phone, otp) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`${phone}:${otp}`)
    .digest("hex");
}

export function verifyOtpHash(phone, otp, hash) {
  const calculated = hashOtp(phone, otp);

  return crypto.timingSafeEqual(
    Buffer.from(calculated, "hex"),
    Buffer.from(hash, "hex")
  );
}

export const OTP_EXPIRE_SECONDS = OTP_TTL_SECONDS;