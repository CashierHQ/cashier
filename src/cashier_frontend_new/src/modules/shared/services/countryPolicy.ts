import { BREVO_SMS_SUPPORTED_COUNTRY_CODES } from "$modules/shared/data/brevoSmsSupportedCountries";
import countryBlacklist from "$modules/routing/data/blacklist.json";
import type { CountryDialCode } from "$modules/shared/types/country";

const BLOCKED_COUNTRY_CODES = new Set(countryBlacklist.country_codes);

export function isBlockedCountryCode(countryCode: string): boolean {
  return BLOCKED_COUNTRY_CODES.has(countryCode.toUpperCase());
}

export function filterAllowedCountries<T extends Pick<CountryDialCode, "code">>(
  countries: T[],
): T[] {
  return countries.filter((country) => !isBlockedCountryCode(country.code));
}

export function isBrevoSmsSupportedCountryCode(countryCode: string): boolean {
  return BREVO_SMS_SUPPORTED_COUNTRY_CODES.has(countryCode.toUpperCase());
}

export function filterBrevoSmsSupportedCountries<
  T extends Pick<CountryDialCode, "code">,
>(countries: T[]): T[] {
  return countries.filter((country) =>
    isBrevoSmsSupportedCountryCode(country.code),
  );
}

export function filterSmsEligibleCountries<
  T extends Pick<CountryDialCode, "code">,
>(countries: T[]): T[] {
  return filterAllowedCountries(filterBrevoSmsSupportedCountries(countries));
}
