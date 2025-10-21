import { describe, expect, it } from "vitest";
import {
  balanceToUSDValue,
  formatBalanceUnits,
  parseBalanceUnits,
} from "./converter";

describe("parseBalanceUnits", () => {
  it("should throw an error for negative decimals", () => {
    expect(() => parseBalanceUnits(100000000n, -1)).toThrow(
      "Decimals cannot be negative",
    );
  });

  it("should handle zero balance", () => {
    expect(parseBalanceUnits(0n, 8)).toBe(0);
  });

  it("should convert balance to ICP correctly", () => {
    expect(parseBalanceUnits(100000000n, 8)).toBe(1);
    expect(parseBalanceUnits(250000000n, 8)).toBe(2.5);
    expect(parseBalanceUnits(123456789n, 8)).toBeCloseTo(1.23456789);
  });
});

describe("formatBalanceUnits", () => {
  it("should throw an error for negative decimals", () => {
    expect(() => formatBalanceUnits(1, -1)).toThrow(
      "Decimals cannot be negative",
    );
  });

  it("should handle zero ICP", () => {
    expect(formatBalanceUnits(0, 8)).toBe(0n);
  });

  it("should convert ICP to balance correctly", () => {
    expect(formatBalanceUnits(1, 8)).toBe(100000000n);
    expect(formatBalanceUnits(2.5, 8)).toBe(250000000n);
    expect(formatBalanceUnits(1.23456789, 8)).toBe(123456789n);
  });
});

describe("balanceToUSDValue", () => {
  it("should throw an error for negative decimals", () => {
    expect(() => balanceToUSDValue(100000000n, -1, 5)).toThrow(
      "Decimals cannot be negative",
    );
  });

  it("should handle zero balance", () => {
    expect(balanceToUSDValue(0n, 8, 5)).toBe(0);
  });

  it("should convert balance to USD value correctly", () => {
    expect(balanceToUSDValue(100000000n, 8, 5)).toBe(5);
    expect(balanceToUSDValue(250000000n, 8, 2)).toBe(5);
    expect(balanceToUSDValue(123456789n, 8, 3)).toBeCloseTo(3.70370367);
  });
});
