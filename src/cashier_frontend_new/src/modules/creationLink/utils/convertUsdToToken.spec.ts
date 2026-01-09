// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { describe, expect, it } from "vitest";
import { convertUsdToToken } from "./convertUsdToToken";

describe("convertUsdToToken", () => {
  it("should convert USD to token correctly", () => {
    const result = convertUsdToToken(100, 10);
    expect(result).toBe(10);
  });

  it("should handle fractional USD amounts", () => {
    const result = convertUsdToToken(25.5, 10);
    expect(result).toBe(2.55);
  });

  it("should handle fractional token prices", () => {
    const result = convertUsdToToken(100, 10.5);
    expect(result).toBeCloseTo(9.5238095238, 5);
  });

  it("should handle zero USD amount", () => {
    const result = convertUsdToToken(0, 10);
    expect(result).toBe(0);
  });

  it("should throw error when token price is zero", () => {
    expect(() => convertUsdToToken(100, 0)).toThrow(
      "Token USD price must be greater than 0",
    );
  });

  it("should throw error when token price is negative", () => {
    expect(() => convertUsdToToken(100, -10)).toThrow(
      "Token USD price must be greater than 0",
    );
  });

  it("should throw error when USD amount is negative", () => {
    expect(() => convertUsdToToken(-100, 10)).toThrow(
      "USD amount cannot be negative",
    );
  });

  it("should handle very small amounts", () => {
    const result = convertUsdToToken(0.01, 1000);
    expect(result).toBe(0.00001);
  });

  it("should handle very large amounts", () => {
    const result = convertUsdToToken(1000000, 0.001);
    expect(result).toBe(1000000000);
  });

  it("should handle decimal precision correctly", () => {
    const result = convertUsdToToken(33.33, 3.33);
    expect(result).toBeCloseTo(10.009009, 3);
  });
});
