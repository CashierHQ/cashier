import { describe, it, expect } from "vitest";
import { calculateNetworkFeeInfo } from "./networkFee";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

describe("calculateNetworkFeeInfo", () => {
  it("should return default values when token is null", () => {
    const result = calculateNetworkFeeInfo(null);

    expect(result).toEqual({
      amount: 0,
      amountFormatted: "0",
      symbol: "",
      decimals: 8,
      usdValue: 0,
      usdValueFormatted: "",
    });
  });

  it("should calculate network fee for ICP token", () => {
    const icpToken: TokenWithPriceAndBalance = {
      name: "Internet Computer",
      symbol: "ICP",
      address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      decimals: 8,
      enabled: true,
      fee: 10_000n, // 0.0001 ICP
      is_default: true,
      balance: 100_000_000n, // 1 ICP
      priceUSD: 10.5,
    };

    const result = calculateNetworkFeeInfo(icpToken);

    expect(result.amount).toBe(0.0001);
    expect(result.amountFormatted).toBe("0.0001");
    expect(result.symbol).toBe("ICP");
    expect(result.decimals).toBe(8);
    expect(result.usdValue).toBeCloseTo(0.0001 * 10.5, 8);
    expect(result.usdValueFormatted).toBeTruthy();
  });

  it("should calculate network fee for ckBTC token", () => {
    const ckBtcToken: TokenWithPriceAndBalance = {
      name: "ckBTC",
      symbol: "ckBTC",
      address: "mxzaz-hqaaa-aaaar-qaada-cai",
      decimals: 8,
      enabled: true,
      fee: 60n, // 0.0000006 ckBTC
      is_default: false,
      balance: 1_000_000_000n, // 10 ckBTC
      priceUSD: 50000,
    };

    const result = calculateNetworkFeeInfo(ckBtcToken);

    expect(result.amount).toBe(0.0000006);
    // formatNumber uses subscript notation for very small numbers (< 1e-6)
    // e.g., 0.0000006 becomes "0.0₆6"
    expect(result.amountFormatted).toMatch(/0\.0[₀-₉]*6/);
    expect(result.symbol).toBe("ckBTC");
    expect(result.decimals).toBe(8);
    expect(result.usdValue).toBeCloseTo(0.0000006 * 50000, 8);
    expect(result.usdValueFormatted).toBeTruthy();
  });

  it("should handle token without priceUSD", () => {
    const tokenWithoutPrice: TokenWithPriceAndBalance = {
      name: "Test Token",
      symbol: "TEST",
      address: "test-address",
      decimals: 8,
      enabled: true,
      fee: 1_000n, // 0.00001 TEST
      is_default: false,
      balance: 100_000_000n,
      priceUSD: 0,
    };

    const result = calculateNetworkFeeInfo(tokenWithoutPrice);

    expect(result.amount).toBe(0.00001);
    expect(result.symbol).toBe("TEST");
    expect(result.usdValue).toBe(0);
    expect(result.usdValueFormatted).toBe("");
  });

  it("should format fee with correct decimals", () => {
    const tokenWith6Decimals: TokenWithPriceAndBalance = {
      name: "Token 6 Decimals",
      symbol: "T6",
      address: "token-6",
      decimals: 6,
      enabled: true,
      fee: 1_000n, // 0.001 T6
      is_default: false,
      balance: 1_000_000n,
      priceUSD: 1,
    };

    const result = calculateNetworkFeeInfo(tokenWith6Decimals);

    expect(result.amount).toBe(0.001);
    expect(result.decimals).toBe(6);
    expect(result.amountFormatted).toBe("0.001");
  });

  it("should handle very small fees correctly", () => {
    const tokenWithSmallFee: TokenWithPriceAndBalance = {
      name: "Small Fee Token",
      symbol: "SFT",
      address: "small-fee",
      decimals: 8,
      enabled: true,
      fee: 1n, // 0.00000001 SFT
      is_default: false,
      balance: 1_000_000_000n,
      priceUSD: 0.5,
    };

    const result = calculateNetworkFeeInfo(tokenWithSmallFee);

    expect(result.amount).toBe(0.00000001);
    expect(result.usdValue).toBeCloseTo(0.00000001 * 0.5, 10);
  });
});
