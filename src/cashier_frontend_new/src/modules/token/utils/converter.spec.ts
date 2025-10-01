import { describe, expect, it } from "vitest";
import { balanceToIcp, balanceToUSDValue } from "./converter";

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
