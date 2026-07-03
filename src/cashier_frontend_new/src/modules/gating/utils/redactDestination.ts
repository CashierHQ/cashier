import { DIAL_CODES_SORTED, DOTS } from "$modules/gating/constants";

/**
 * Redacts an email address, keeping the first character of the local part,
 * its last 4 characters, and the full domain.
 *
 * @param email - The email address to redact.
 * @returns The redacted email address.
 */
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

/**
 * Redacts a phone number, keeping the dial code (if present) plus the first
 * local digit, and the last 4 digits.
 *
 * @param phone - The phone number to redact.
 * @returns The redacted phone number.
 */
function redactPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  if (phone.startsWith("+") && digits.length > 4) {
    const dialCode =
      DIAL_CODES_SORTED.find((dc) => phone.startsWith(dc)) ?? "+";
    const firstLocal = phone.slice(dialCode.length).replace(/\D/g, "")[0] ?? "";
    return `${dialCode}${firstLocal}${DOTS}${last4}`;
  }
  return `${phone[0] ?? ""}${DOTS}${last4}`;
}

/**
 * Redacts a gate destination (email or phone number) for safe display.
 *
 * @param value - The destination value to redact.
 * @param isEmail - Whether `value` is an email address (`true`) or a phone number (`false`).
 * @returns The redacted destination, or `value` unchanged if it's empty.
 */
export function redactDestination(value: string, isEmail: boolean): string {
  if (!value) return value;
  return isEmail ? redactEmail(value) : redactPhone(value);
}
