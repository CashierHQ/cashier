import { describe, expect, it } from "vitest";
import { balanceToIcp, balanceToUSDValue, icpToBalance } from "./converter";

describe("balanceToIcp", () => {
  it("should throw an error for negative decimals", () => {
    expect(() => balanceToIcp(100000000n, -1)).toThrow(
      "Decimals cannot be negative",
    );
  });

  it("should handle zero balance", () => {
    expect(balanceToIcp(0n, 8)).toBe(0);
  });

  it("should convert balance to ICP correctly", () => {
    expect(balanceToIcp(100000000n, 8)).toBe(1);
    expect(balanceToIcp(250000000n, 8)).toBe(2.5);
    expect(balanceToIcp(123456789n, 8)).toBeCloseTo(1.23456789);
  });
});

describe("icpToBalance", () => {
  it("should throw an error for negative decimals", () => {
    expect(() => icpToBalance(1, -1)).toThrow("Decimals cannot be negative");
  });

  it("should handle zero ICP", () => {
    expect(icpToBalance(0, 8)).toBe(0n);
  });

  it("should convert ICP to balance correctly", () => {
    expect(icpToBalance(1, 8)).toBe(100000000n);
    expect(icpToBalance(2.5, 8)).toBe(250000000n);
    expect(icpToBalance(1.23456789, 8)).toBe(123456789n);
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
