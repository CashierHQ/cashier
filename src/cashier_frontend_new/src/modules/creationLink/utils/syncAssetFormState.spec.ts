// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { describe, expect, it } from "vitest";
import { syncAssetFormState } from "./syncAssetFormState";

describe("syncAssetFormState", () => {
  const defaultParams = {
    assetUseAmount: 100000000n, // 1 token with 8 decimals
    decimals: 8,
    tokenUsdPrice: 10.5,
    canConvert: true,
    addressChanged: false,
    amountChanged: false,
    previousUseAmount: undefined,
    isUsd: false,
  };

  it("should clear amounts when address changed", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      addressChanged: true,
    });

    expect(result.localTokenAmount).toBe("");
    expect(result.localUsdAmount).toBe("");
    expect(result.shouldUpdate).toBe(true);
  });

  it("should clear amounts when amount is zero and address changed", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      assetUseAmount: 0n,
      addressChanged: true,
    });

    expect(result.localTokenAmount).toBe("");
    expect(result.localUsdAmount).toBe("");
    expect(result.shouldUpdate).toBe(true);
  });

  it("should update token amount when amount changed", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      amountChanged: true,
    });

    expect(result.localTokenAmount).toBe("1");
    expect(result.localUsdAmount).toBe("10.5");
    expect(result.shouldUpdate).toBe(true);
  });

  it("should update when previous amount is undefined and not in USD mode", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      previousUseAmount: undefined,
      isUsd: false,
    });

    expect(result.localTokenAmount).toBe("1");
    expect(result.localUsdAmount).toBe("10.5");
    expect(result.shouldUpdate).toBe(true);
  });

  it("should not update when in USD mode and previous amount is undefined", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      previousUseAmount: undefined,
      isUsd: true,
    });

    expect(result.shouldUpdate).toBe(false);
  });

  it("should not update when nothing changed", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      previousUseAmount: 100000000n,
    });

    expect(result.shouldUpdate).toBe(false);
  });

  it("should calculate USD amount correctly", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      amountChanged: true,
      tokenUsdPrice: 25.75,
      assetUseAmount: 200000000n, // 2 tokens
    });

    expect(result.localTokenAmount).toBe("2");
    expect(result.localUsdAmount).toBe("51.5");
    expect(result.shouldUpdate).toBe(true);
  });

  it("should not calculate USD when canConvert is false", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      amountChanged: true,
      canConvert: false,
    });

    expect(result.localTokenAmount).toBe("1");
    expect(result.localUsdAmount).toBe("");
    expect(result.shouldUpdate).toBe(true);
  });

  it("should not calculate USD when tokenUsdPrice is undefined", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      amountChanged: true,
      tokenUsdPrice: undefined,
    });

    expect(result.localTokenAmount).toBe("1");
    expect(result.localUsdAmount).toBe("");
    expect(result.shouldUpdate).toBe(true);
  });

  it("should handle zero amount correctly", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      assetUseAmount: 0n,
      addressChanged: false,
    });

    expect(result.shouldUpdate).toBe(false);
  });

  it("should round USD value to 4 decimal places", () => {
    const result = syncAssetFormState({
      ...defaultParams,
      amountChanged: true,
      tokenUsdPrice: 10.123456789,
      assetUseAmount: 100000000n, // 1 token
    });

    // Should round to 4 decimal places: 10.123456789 * 1 = 10.123456789 -> 10.1235
    expect(result.localTokenAmount).toBe("1");
    expect(result.localUsdAmount).toBe("10.12");
    expect(result.shouldUpdate).toBe(true);
  });
});
