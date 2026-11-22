export function isValidIranianNationalCode(value) {
  const code = String(value ?? "").trim();

  if (!/^\d{10}$/.test(code)) return false;

  if (/^(\d)\1{9}$/.test(code)) return false;

  const checkDigit = Number(code[9]);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(code[i]) * (10 - i);
  }

  const remainder = sum % 11;
  const expected = remainder < 2 ? remainder : 11 - remainder;

  return checkDigit === expected;
}
