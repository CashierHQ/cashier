import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatTokenPrice,
  formatUsdAmount,
  formatFeeAmount,
} from "./formatNumber";

describe("formatNumber", () => {
  it("formats regular numbers", () => {
    expect(formatNumber(123.456)).toBe("123.456");
    expect(formatNumber(12.3456)).toBe("12.3456");
    expect(formatNumber(1.23456789)).toBe("1.23456789");
    expect(formatNumber(0.12345)).toBe("0.12345");
    expect(formatNumber(0.1)).toBe("0.1");
    expect(formatNumber(0.0005002)).toBe("0.0005002");
  });

  it("formats large numbers", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1000.123)).toBe("1,000.123");
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

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(0.0)).toBe("0");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-123.456)).toBe("-123.456");
    expect(formatNumber(-1000)).toBe("-1,000");
    expect(formatNumber(-0.12345)).toBe("-0.12345");
    expect(formatNumber(-0.00000005123)).toBe("-0.0₇5123");
  });

  it("respects tofixed option", () => {
    expect(formatNumber(123.456789, { tofixed: 2 })).toBe("123.46");
    expect(formatNumber(123.456789, { tofixed: 0 })).toBe("123");
    expect(formatNumber(123.456789, { tofixed: 8 })).toBe("123.456789");
    expect(formatNumber(0.1, { tofixed: 3 })).toBe("0.1");
    expect(formatNumber(0.123, { tofixed: 1 })).toBe("0.1");
  });

  it("handles boundary values", () => {
    // Values >= 1e-6 are formatted normally
    expect(formatNumber(0.00001)).toBe("0.00001");
    expect(formatNumber(-0.00001)).toBe("-0.00001");
    expect(formatNumber(999.999)).toBe("999.999");
    expect(formatNumber(1000)).toBe("1,000");
  });

  it("trims trailing zeros", () => {
    expect(formatNumber(123.0)).toBe("123");
    expect(formatNumber(123.1)).toBe("123.1");
    expect(formatNumber(123.12)).toBe("123.12");
    expect(formatNumber(0.1)).toBe("0.1");
  });
});

describe("formatTokenPrice", () => {
  it("formats prices greater than 100 with 3 decimal places", () => {
    expect(formatTokenPrice(100.1)).toBe("$100.1");
    expect(formatTokenPrice(500.123456)).toBe("$500.123");
    expect(formatTokenPrice(1000)).toBe("$1,000");
    expect(formatTokenPrice(1234.56789)).toBe("$1,234.568");
  });

  it("formats prices greater than 10 with 4 decimal places", () => {
    expect(formatTokenPrice(10.1)).toBe("$10.1");
    expect(formatTokenPrice(50.123456)).toBe("$50.1235");
    expect(formatTokenPrice(99.9999)).toBe("$99.9999");
  });

  it("formats prices greater than 0.001 with 5 decimal places", () => {
    expect(formatTokenPrice(0.0011)).toBe("$0.0011");
    expect(formatTokenPrice(0.123456)).toBe("$0.12346");
    expect(formatTokenPrice(9.99999)).toBe("$9.99999");
  });

  it("formats prices less than or equal to 0.001 with 7 decimal places", () => {
    expect(formatTokenPrice(0.001)).toBe("$0.001");
    expect(formatTokenPrice(0.0001)).toBe("$0.0001");
    expect(formatTokenPrice(0.0000001)).toBe("$0.0000001");
  });

  it("returns '-' for invalid prices", () => {
    expect(formatTokenPrice(0)).toBe("-");
    expect(formatTokenPrice(-1)).toBe("-");
    expect(formatTokenPrice(-100)).toBe("-");
  });

  it("handles edge cases", () => {
    expect(formatTokenPrice(100.0001)).toBe("$100");
    expect(formatTokenPrice(10.0001)).toBe("$10.0001");
    // 0.0011 > 0.001, so it should have 5 decimal places
    expect(formatTokenPrice(0.0011)).toBe("$0.0011");
  });

  it("formats large prices with locale grouping", () => {
    expect(formatTokenPrice(1000000)).toBe("$1,000,000");
    expect(formatTokenPrice(1234567.89)).toBe("$1,234,567.89");
  });
});

describe("formatUsdAmount", () => {
  it("formats numbers with max 2 decimal places, removing trailing zeros", () => {
    expect(formatUsdAmount(5)).toBe("5");
    expect(formatUsdAmount(5.0)).toBe("5");
    expect(formatUsdAmount(5.1)).toBe("5.1");
    expect(formatUsdAmount(5.12)).toBe("5.12");
    expect(formatUsdAmount(5.123)).toBe("5.12"); // rounded to 2 decimals
    expect(formatUsdAmount(5.1234)).toBe("5.12"); // rounded to 2 decimals
    expect(formatUsdAmount(26.0)).toBe("26");
    expect(formatUsdAmount(26.0)).toBe("26");
    expect(formatUsdAmount(52.25985)).toBe("52.26");
  });

  it("formats strings with max 2 decimal places, removing trailing zeros", () => {
    expect(formatUsdAmount("5")).toBe("5");
    expect(formatUsdAmount("5.0")).toBe("5");
    expect(formatUsdAmount("5.1000000")).toBe("5.1");
    expect(formatUsdAmount("5.1200000")).toBe("5.12");
    expect(formatUsdAmount("5.1230000")).toBe("5.12"); // rounded to 2 decimals
    expect(formatUsdAmount("26.00")).toBe("26");
    expect(formatUsdAmount("52.25985")).toBe("52.26");
  });

  it("handles NaN", () => {
    expect(formatUsdAmount(NaN)).toBe("0");
    expect(formatUsdAmount("invalid")).toBe("0");
    expect(formatUsdAmount("")).toBe("0");
  });

  it("handles zero", () => {
    expect(formatUsdAmount(0)).toBe("0");
    expect(formatUsdAmount(0.0)).toBe("0");
    expect(formatUsdAmount("0")).toBe("0");
  });

  it("handles negative numbers with max 2 decimal places", () => {
    expect(formatUsdAmount(-5)).toBe("-5");
    expect(formatUsdAmount(-5.1)).toBe("-5.1");
    expect(formatUsdAmount(-5.12)).toBe("-5.12");
    expect(formatUsdAmount("-5.123")).toBe("-5.12"); // rounded to 2 decimals
  });

  it("rounds to 2 decimal places (cents)", () => {
    expect(formatUsdAmount(5.1234567)).toBe("5.12"); // rounded
    expect(formatUsdAmount(5.12345678)).toBe("5.12"); // rounded
    expect(formatUsdAmount(5.125)).toBe("5.13"); // rounded up
    expect(formatUsdAmount(5.124)).toBe("5.12"); // rounded down
  });

  it("handles large numbers with max 2 decimal places", () => {
    expect(formatUsdAmount(1000000)).toBe("1000000");
    expect(formatUsdAmount(1000000.0)).toBe("1000000");
    expect(formatUsdAmount(1000000.123)).toBe("1000000.12"); // rounded to 2 decimals
  });

  it("handles very small numbers, rounding to 2 decimals or showing 0", () => {
    expect(formatUsdAmount(0.001)).toBe("0"); // rounds to 0.00 -> "0"
    expect(formatUsdAmount(0.01)).toBe("0.01");
    expect(formatUsdAmount(0.005)).toBe("0.01"); // rounds up
    expect(formatUsdAmount(0.004)).toBe("0"); // rounds down to 0.00 -> "0"
  });
});

describe("formatFeeAmount", () => {
  it("formats small fees (< 0.02) with 4 decimal places", () => {
    expect(formatFeeAmount(0.001)).toBe("0.001");
    expect(formatFeeAmount(0.0012)).toBe("0.0012");
    expect(formatFeeAmount(0.00123)).toBe("0.0012");
    expect(formatFeeAmount(0.001234)).toBe("0.0012");
    expect(formatFeeAmount(0.0012345)).toBe("0.0012"); // rounded to 4 decimals
    expect(formatFeeAmount(0.01)).toBe("0.01");
    expect(formatFeeAmount(0.015)).toBe("0.015");
    expect(formatFeeAmount(0.0156)).toBe("0.0156");
    expect(formatFeeAmount(0.01567)).toBe("0.0157"); // rounded to 4 decimals
    expect(formatFeeAmount(0.01999)).toBe("0.02"); // rounded to 4 decimals, but >= 0.02 threshold
  });

  it("formats larger fees (>= 0.02) with 2 decimal places like formatUsdAmount", () => {
    expect(formatFeeAmount(0.02)).toBe("0.02");
    expect(formatFeeAmount(0.021)).toBe("0.02");
    expect(formatFeeAmount(0.025)).toBe("0.03"); // rounded to 2 decimals
    expect(formatFeeAmount(0.1)).toBe("0.1");
    expect(formatFeeAmount(0.12)).toBe("0.12");
    expect(formatFeeAmount(5)).toBe("5");
    expect(formatFeeAmount(5.1)).toBe("5.1");
    expect(formatFeeAmount(5.12)).toBe("5.12");
    expect(formatFeeAmount(5.123)).toBe("5.12"); // rounded to 2 decimals
    expect(formatFeeAmount(52.25985)).toBe("52.26");
  });

  it("handles NaN", () => {
    expect(formatFeeAmount(NaN)).toBe("0");
  });

  it("handles zero", () => {
    expect(formatFeeAmount(0)).toBe("0");
    expect(formatFeeAmount(0.0)).toBe("0");
  });

  it("handles negative numbers with adaptive decimal places", () => {
    expect(formatFeeAmount(-0.001)).toBe("-0.001");
    expect(formatFeeAmount(-0.0012)).toBe("-0.0012");
    expect(formatFeeAmount(-0.01567)).toBe("-0.0157");
    expect(formatFeeAmount(-0.02)).toBe("-0.02");
    expect(formatFeeAmount(-5.123)).toBe("-5.12");
  });

  it("rounds small amounts to 4 decimal places", () => {
    expect(formatFeeAmount(0.0012345)).toBe("0.0012"); // rounded
    expect(formatFeeAmount(0.00123456)).toBe("0.0012"); // rounded
    expect(formatFeeAmount(0.00125)).toBe("0.0013"); // rounded up
    expect(formatFeeAmount(0.00124)).toBe("0.0012"); // rounded down
    expect(formatFeeAmount(0.015678)).toBe("0.0157"); // rounded up
  });

  it("handles boundary value at 0.02 threshold", () => {
    expect(formatFeeAmount(0.01999)).toBe("0.02"); // rounds to 0.02, which is >= threshold
    expect(formatFeeAmount(0.0199)).toBe("0.0199"); // < 0.02, shows 4 decimals
    expect(formatFeeAmount(0.02)).toBe("0.02"); // exactly at threshold
    expect(formatFeeAmount(0.02001)).toBe("0.02"); // just above threshold
  });

  it("handles very small amounts that round to zero", () => {
    expect(formatFeeAmount(0.00001)).toBe("0");
    expect(formatFeeAmount(0.00005)).toBe("0.0001"); // rounds up
    expect(formatFeeAmount(0.00004)).toBe("0"); // rounds down to 0
  });

  it("handles large numbers with 2 decimal places", () => {
    expect(formatFeeAmount(1000000)).toBe("1000000");
    expect(formatFeeAmount(1000000.0)).toBe("1000000");
    expect(formatFeeAmount(1000000.123)).toBe("1000000.12"); // rounded to 2 decimals
  });
});
