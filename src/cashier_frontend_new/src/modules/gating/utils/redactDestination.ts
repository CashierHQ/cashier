import { COUNTRY_DIAL_CODES } from "$modules/shared/data/countries";
import { getPhoneDialCode } from "$modules/shared/services/phoneNumber";

const DOTS = "•••••";

const DIAL_CODES_SORTED = COUNTRY_DIAL_CODES.map((c) =>
  getPhoneDialCode(c.code, c.dialCode),
).sort((a, b) => b.length - a.length);

function redactEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex < 0) {
    return email.length <= 5 ? email : `${email[0]}${DOTS}${email.slice(-4)}`;
  }
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex); // includes the @
  if (local.length <= 1) return email;
  const tail = local.slice(-4);
  return `${local[0]}${DOTS}${tail}${domain}`;
}

function redactPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  if (phone.startsWith("+") && digits.length > 4) {
    const dialCode = DIAL_CODES_SORTED.find((dc) => phone.startsWith(dc)) ?? "+";
    const firstLocal = phone.slice(dialCode.length).replace(/\D/g, "")[0] ?? "";
    return `${dialCode}${firstLocal}${DOTS}${last4}`;
  }
  return `${phone[0] ?? ""}${DOTS}${last4}`;
}

export function redactDestination(value: string, isEmail: boolean): string {
  if (!value) return value;
  return isEmail ? redactEmail(value) : redactPhone(value);
}
