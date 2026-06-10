import { describe, expect, it } from "vitest";
import { resolveIpProtection } from "./ipProtection";

describe("ipProtection", () => {
  it("waits while IP location is loading", () => {
    expect(
      resolveIpProtection({
        isLoading: true,
        countryCode: null,
        isBlacklisted: false,
      }),
    ).toEqual({ kind: "pending" });
  });

  it("allows rendering when country code is missing", () => {
    expect(
      resolveIpProtection({
        isLoading: false,
        countryCode: null,
        isBlacklisted: true,
      }),
    ).toEqual({ kind: "allow" });
  });

  it("allows rendering when country is not blacklisted", () => {
    expect(
      resolveIpProtection({
        isLoading: false,
        countryCode: "CA",
        isBlacklisted: false,
      }),
    ).toEqual({ kind: "allow" });
  });

  it("blocks rendering when country is blacklisted", () => {
    expect(
      resolveIpProtection({
        isLoading: false,
        countryCode: "US",
        isBlacklisted: true,
      }),
    ).toEqual({ kind: "block" });
  });
});
