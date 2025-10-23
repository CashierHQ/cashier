import { describe, it, expect } from "vitest";
import { formatNumber } from "./formatNumber";

describe("formatNumber", () => {
  it("formats regular numbers", () => {
    expect(formatNumber(123.456)).toBe("123.456");
    expect(formatNumber(12.3456)).toBe("12.3456");
    expect(formatNumber(1.23456789)).toBe("1.23457");
    expect(formatNumber(0.12345)).toBe("0.12345");
    expect(formatNumber(0.1)).toBe("0.1");
  });

  it("formats large numbers", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1000.123)).toBe("1,000.123");
    expect(formatNumber(100000000)).toBe("100,000,000");
    expect(formatNumber(100000000)).toBe("100,000,000");
    expect(formatNumber(1234567.89)).toBe("1,234,567.89");
  });

  it("formats very small numbers using subscript or truncation", () => {
    expect(formatNumber(0.00000005123)).toBe("0.0₇5123");
    expect(formatNumber(1e-10)).toMatch("0.0₉1");
    expect(formatNumber(1e-7)).toBe("0.0₆1");
    expect(formatNumber(8.7e-7)).toBe("0.0₆87");
    expect(formatNumber(0.0000009)).toBe("0.0₆9");
  });
});
