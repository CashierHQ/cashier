import { describe, expect, it } from "vitest";
import {
  buildInternationalPhoneNumber,
  formatPhoneNumberForCountry,
  getDigitsOnly,
  getPhoneDialCode,
  getPhonePlaceholder,
  isValidInternationalPhoneNumber,
} from "$modules/shared/services/phoneNumber";

describe("phoneNumber", () => {
  it("formats US phone numbers as the user types", () => {
    expect(formatPhoneNumberForCountry("4375551234", "US")).toBe(
      "(437) 555-1234",
    );
  });

  it("strips user-entered phone symbols", () => {
    expect(getDigitsOnly("(437) 555-1234")).toBe("4375551234");
  });

  it("builds international phone numbers with the selected country dial code", () => {
    expect(buildInternationalPhoneNumber("US", "4375551234")).toBe(
      "+14375551234",
    );
  });

  it("returns country-specific placeholders", () => {
    expect(getPhonePlaceholder("US")).toBe("(201) 555-0123");
  });

  it("normalizes country dial codes from country metadata", () => {
    expect(getPhoneDialCode("KY", "+ 345")).toBe("+1");
  });

  it("validates international phone numbers against numbering rules", () => {
    expect(isValidInternationalPhoneNumber("+14375551234")).toBe(true);
    expect(isValidInternationalPhoneNumber("+143755512341")).toBe(false);
  });
});
