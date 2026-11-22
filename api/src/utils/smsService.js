
import { KavenegarSmsProvider } from "@mhbdev/sms/kavenegar";

let sms = null;

function getSmsProvider() {
  if (sms) return sms;

  const apiKey = process.env.KAVENEGAR_API_KEY;
  const sender = process.env.KAVENEGAR_SENDER;

  if (!apiKey) {
    throw new Error("KAVENEGAR_API_KEY تنظیم نشده است");
  }

  if (!sender) {
    throw new Error("KAVENEGAR_SENDER تنظیم نشده است");
  }

  sms = new KavenegarSmsProvider({
    apiKey,
    sender,
  });

  return sms;
}

export async function sendSms(phone, message) {
  try {
console.log("SMS FUNCTION CALLED:", {
  phoneReceived: !!phone,
  messageLength: String(message).length,
});
    let cleanPhone = String(phone).trim();

    if (cleanPhone.startsWith("09")) {
      cleanPhone = "+98" + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith("0098")) {
      cleanPhone = "+" + cleanPhone.slice(2);
    } else if (cleanPhone.startsWith("98")) {
      cleanPhone = "+" + cleanPhone;
    }

    if (!/^\+989\d{9}$/.test(cleanPhone)) {
      throw new Error("شماره موبایل نامعتبر است");
    }

    const provider = getSmsProvider();

    const result = await provider.sendMessage({
      recipient: cleanPhone,
      message: String(message),
    });

    console.log("Kavenegar SMS result:", result);

    return {
      success: true,
      result,
    };

  } catch (error) {
    console.error("Kavenegar SMS Error:", {
      name: error.name,
      message: error.message,
      code: error.code,
      providerStatus: error.providerStatus,
      httpStatus: error.httpStatus,
      cause: error.cause?.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}
