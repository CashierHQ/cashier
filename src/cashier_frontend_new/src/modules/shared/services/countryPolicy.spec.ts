import { describe, expect, it } from "vitest";
import {
  filterBrevoSmsSupportedCountries,
  filterAllowedCountries,
  filterSmsEligibleCountries,
  isBrevoSmsSupportedCountryCode,
  isBlockedCountryCode,
} from "$modules/shared/services/countryPolicy";

describe("countryPolicy", () => {
  it("detects blocked country codes case-insensitively", () => {
    expect(isBlockedCountryCode("US")).toBe(true);
    expect(isBlockedCountryCode("us")).toBe(true);
  });

  it("filters blocked countries from country lists", () => {
    expect(
      filterAllowedCountries([
        { name: "United States", dialCode: "+1", code: "US" },
        { name: "Canada", dialCode: "+1", code: "CA" },
      ]),
    ).toEqual([{ name: "Canada", dialCode: "+1", code: "CA" }]);
  });

  it("detects Brevo SMS supported countries", () => {
    expect(isBrevoSmsSupportedCountryCode("CA")).toBe(true);
    expect(isBrevoSmsSupportedCountryCode("SG")).toBe(false);
  });

  it("filters countries unsupported by Brevo SMS", () => {
    expect(
      filterBrevoSmsSupportedCountries([
        { name: "Canada", dialCode: "+1", code: "CA" },
        { name: "Singapore", dialCode: "+65", code: "SG" },
      ]),
    ).toEqual([{ name: "Canada", dialCode: "+1", code: "CA" }]);
  });

  it("filters countries blocked by policy even when Brevo supports them", () => {
    expect(
      filterSmsEligibleCountries([
        { name: "United States", dialCode: "+1", code: "US" },
        { name: "Canada", dialCode: "+1", code: "CA" },
        { name: "Singapore", dialCode: "+65", code: "SG" },
      ]),
    ).toEqual([{ name: "Canada", dialCode: "+1", code: "CA" }]);
  });
});
