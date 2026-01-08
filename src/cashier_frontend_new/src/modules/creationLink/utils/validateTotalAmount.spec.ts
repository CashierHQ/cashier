// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { describe, expect, it } from "vitest";
import { validateTotalAmount } from "./validateTotalAmount";

describe("validateTotalAmount", () => {
  it("should return valid when total amount is within limit", () => {
    const result = validateTotalAmount({
      perUseAmount: 10,
      maxUse: 5,
      maxTotalAmount: 100,
    });

    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBe(50);
    expect(result.exceedsLimit).toBe(false);
    expect(result.maxPerUse).toBe(20);
  });

  it("should return invalid when total amount exceeds limit", () => {
    const result = validateTotalAmount({
      perUseAmount: 25,
      maxUse: 5,
      maxTotalAmount: 100,
    });

    expect(result.isValid).toBe(false);
    expect(result.calculatedTotal).toBe(125);
    expect(result.exceedsLimit).toBe(true);
    expect(result.maxPerUse).toBe(20);
  });

  it("should return valid when maxUse is 0", () => {
    const result = validateTotalAmount({
      perUseAmount: 100,
      maxUse: 0,
      maxTotalAmount: 50,
    });

    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBe(0);
    expect(result.exceedsLimit).toBe(false);
    expect(result.maxPerUse).toBe(0);
  });

  it("should return valid when maxUse is negative", () => {
    const result = validateTotalAmount({
      perUseAmount: 100,
      maxUse: -1,
      maxTotalAmount: 50,
    });

    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBe(0);
    expect(result.exceedsLimit).toBe(false);
    expect(result.maxPerUse).toBe(0);
  });

  it("should calculate maxPerUse correctly", () => {
    const result = validateTotalAmount({
      perUseAmount: 15,
      maxUse: 10,
      maxTotalAmount: 100,
    });

    expect(result.maxPerUse).toBe(10);
    expect(result.calculatedTotal).toBe(150);
    expect(result.exceedsLimit).toBe(true);
  });

  it("should handle edge case when total equals limit", () => {
    const result = validateTotalAmount({
      perUseAmount: 20,
      maxUse: 5,
      maxTotalAmount: 100,
    });

    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBe(100);
    expect(result.exceedsLimit).toBe(false);
    expect(result.maxPerUse).toBe(20);
  });

  it("should handle fractional amounts", () => {
    const result = validateTotalAmount({
      perUseAmount: 10.5,
      maxUse: 3,
      maxTotalAmount: 30,
    });

    expect(result.isValid).toBe(false);
    expect(result.calculatedTotal).toBe(31.5);
    expect(result.exceedsLimit).toBe(true);
    expect(result.maxPerUse).toBe(10);
  });

  it("should handle very large numbers", () => {
    const result = validateTotalAmount({
      perUseAmount: 1000000,
      maxUse: 1000,
      maxTotalAmount: 1000000000,
    });

    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBe(1000000000);
    expect(result.exceedsLimit).toBe(false);
    expect(result.maxPerUse).toBe(1000000);
  });
});
