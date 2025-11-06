import { describe, expect, it } from "vitest";
import {
  computeAmountFromInput,
  parseDisplayNumber,
  sanitizeInput,
} from "./inputAmount";

describe("inputAmount utils", () => {
  it("sanitizeInput removes letters and keeps digits, dot, comma", () => {
    expect(sanitizeInput("1,23a4.5b6")).toBe("1,234.56");
    expect(sanitizeInput("abc")).toBe("");
    expect(sanitizeInput("1..2.3")).toBe("1.23");
  });

  it("parseDisplayNumber parses strings with commas", () => {
    expect(parseDisplayNumber("1,234.56")).toBeCloseTo(1234.56);
    expect(parseDisplayNumber("")).toBeNull();
    expect(parseDisplayNumber(null as unknown)).toBeNull();
  });

  it("computeAmountFromInput converts amount mode correctly", () => {
    // 1.23 tokens -> base units with 8 decimals = 123000000
    expect(
      computeAmountFromInput({
        num: 1.23,
        mode: "amount",
        decimals: 8,
      }),
    ).toBe(123000000n);
    // zero
    expect(
      computeAmountFromInput({
        num: 0,
        mode: "amount",
        decimals: 8,
      }),
    ).toBe(0n);
  });

  it("computeAmountFromInput converts usd mode using priceUsd", () => {
    // priceUsd = 2 -> 4 USD means 2 tokens -> with 8 decimals = 200000000
    expect(
      computeAmountFromInput({
        num: 4,
        mode: "usd",
        priceUsd: 2,
        decimals: 8,
      }),
    ).toBe(200000000n);
    // missing or invalid price -> returns 0
    expect(
      computeAmountFromInput({
        num: 4,
        mode: "usd",
        decimals: 8,
      }),
    ).toBe(0n);
    expect(
      computeAmountFromInput({
        num: 4,
        mode: "usd",
        priceUsd: 0,
        decimals: 8,
      }),
    ).toBe(0n);
  });
});
