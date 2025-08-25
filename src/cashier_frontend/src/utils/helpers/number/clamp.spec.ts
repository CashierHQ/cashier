// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { clampMax, clampMin, clamp } from "./clamp";

describe("clampMax", () => {
  it("should return the value if it is less than or equal to max", () => {
    expect(clampMax(5, 10)).toBe(5);
    expect(clampMax(10, 10)).toBe(10);
  });

  it("should return max if value is greater than max", () => {
    expect(clampMax(15, 10)).toBe(10);
  });
});

describe("clampMin", () => {
  it("should return the value if it is greater than or equal to min", () => {
    expect(clampMin(5, 2)).toBe(5);
    expect(clampMin(2, 2)).toBe(2);
  });

  it("should return min if value is less than min", () => {
    expect(clampMin(1, 2)).toBe(2);
  });
});

describe("clamp", () => {
  it("should return the value if it is within the range", () => {
    expect(clamp(5, 2, 10)).toBe(5);
  });

  it("should return min if value is less than min", () => {
    expect(clamp(1, 2, 10)).toBe(2);
  });

  it("should return max if value is greater than max", () => {
    expect(clamp(15, 2, 10)).toBe(10);
  });
});
