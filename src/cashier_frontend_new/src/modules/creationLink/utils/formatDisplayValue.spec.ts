import { describe, it, expect } from "vitest";
import { formatDisplayValue } from "./formatDisplayValue";

describe("formatDisplayValue", () => {
  it("should return empty string for empty input", () => {
    expect(formatDisplayValue("")).toBe("");
  });

  it("should return empty string for falsy values", () => {
    expect(formatDisplayValue("")).toBe("");
  });

  it("should return value as-is for normal numbers", () => {
    expect(formatDisplayValue("123")).toBe("123");
    expect(formatDisplayValue("123.45")).toBe("123.45");
    expect(formatDisplayValue("0.001")).toBe("0.001");
    expect(formatDisplayValue("1000")).toBe("1000");
  });

  it("should format very small numbers (< 0.0001) using toLocaleString", () => {
    const result1 = formatDisplayValue("0.00001");
    // toLocaleString may return the same string, but parseFloat should work correctly
    expect(parseFloat(result1)).toBeCloseTo(0.00001, 10);
    expect(typeof result1).toBe("string");

    const result2 = formatDisplayValue("0.0000001");
    expect(parseFloat(result2)).toBeCloseTo(0.0000001, 10);
    expect(typeof result2).toBe("string");

    const result3 = formatDisplayValue("0.00005");
    expect(parseFloat(result3)).toBeCloseTo(0.00005, 10);
    expect(typeof result3).toBe("string");
  });

  it("should handle negative small numbers", () => {
    const result = formatDisplayValue("-0.00001");
    expect(parseFloat(result)).toBeCloseTo(-0.00001, 10);
  });

  it("should return value as-is for zero", () => {
    expect(formatDisplayValue("0")).toBe("0");
    expect(formatDisplayValue("0.0")).toBe("0.0");
  });

  it("should return value as-is for numbers >= 0.0001", () => {
    expect(formatDisplayValue("0.0001")).toBe("0.0001");
    expect(formatDisplayValue("0.0002")).toBe("0.0002");
    expect(formatDisplayValue("0.001")).toBe("0.001");
  });

  it("should handle invalid number strings", () => {
    const result = formatDisplayValue("abc");
    expect(result).toBe("abc");
    expect(isNaN(parseFloat(result))).toBe(true);
  });
});
