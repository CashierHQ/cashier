import {
  AsYouType,
  getCountryCallingCode,
  getExampleNumber,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js/min";
import examples from "libphonenumber-js/examples.mobile.json";

const DEFAULT_PHONE_PLACEHOLDER = "555 000 0000";

function toCountryCode(countryCode: string): CountryCode | null {
  const normalizedCountryCode = countryCode.toUpperCase();

  try {
    getCountryCallingCode(normalizedCountryCode as CountryCode);
    return normalizedCountryCode as CountryCode;
  } catch {
    return null;
  }
}

export function getDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function getPhoneDialCode(
  countryCode: string,
  fallbackDialCode = "",
): string {
  const supportedCountryCode = toCountryCode(countryCode);

  if (!supportedCountryCode) {
    return fallbackDialCode.replace(/\s/g, "");
  }

  return `+${getCountryCallingCode(supportedCountryCode)}`;
}

export function getPhonePlaceholder(countryCode: string): string {
  const supportedCountryCode = toCountryCode(countryCode);
  if (!supportedCountryCode) return DEFAULT_PHONE_PLACEHOLDER;

  return (
    getExampleNumber(supportedCountryCode, examples)?.formatNational() ??
    DEFAULT_PHONE_PLACEHOLDER
  );
}

export function formatPhoneNumberForCountry(
  phoneDigits: string,
  countryCode: string,
): string {
  const supportedCountryCode = toCountryCode(countryCode);
  const digits = getDigitsOnly(phoneDigits);

  if (!supportedCountryCode) return digits;

  return new AsYouType(supportedCountryCode).input(digits);
}

export function buildInternationalPhoneNumber(
  countryCode: string,
  phoneDigits: string,
  fallbackDialCode = "",
): string {
  const dialCode = getPhoneDialCode(countryCode, fallbackDialCode);
  const digits = getDigitsOnly(phoneDigits);

  return `${dialCode}${digits}`;
}

export function isValidInternationalPhoneNumber(phoneNumber: string): boolean {
  return isValidPhoneNumber(phoneNumber);
}
