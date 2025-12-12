import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { describe, expect, it } from "vitest";
import {
  calculateRequiredAssetAmount,
  maxAmountForAsset,
} from "./amountCalculator";
import { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";

describe("calculateRequiredAssetAmount", () => {
  it("should return an error if token is not found", () => {
    const assets: CreateLinkAsset[] = [
      new CreateLinkAsset("nonexistentToken", 1000n),
    ];
    const maxUse = 2;
    const mockWalletTokens: TokenWithPriceAndBalance[] = [];

    const result = calculateRequiredAssetAmount(
      assets,
      maxUse,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        "Token with address nonexistentToken not found in wallet",
      );
    }
  });

  it("should calculate required amounts correctly", () => {
    const fee1 = 10_000n;
    const fee2 = 2_000n;

    const amount1 = 1000_000n;
    const amount2 = 2000_000n;
    const assets: CreateLinkAsset[] = [
      new CreateLinkAsset("0xtoken1", amount1),
      new CreateLinkAsset("0xtoken2", amount2),
    ];
    const maxUse = 3;
    const mockWalletTokens: TokenWithPriceAndBalance[] = [
      {
        name: "token1",
        symbol: "TKN1",
        address: "0xtoken1",
        decimals: 8,
        enabled: true,
        fee: fee1,
        is_default: false,
        balance: 1_000_000_000n,
        priceUSD: 1.0,
      },
      {
        name: "token2",
        symbol: "TKN2",
        address: "0xtoken2",
        decimals: 8,
        enabled: true,
        fee: fee2,
        is_default: false,
        balance: 1_000_000_000n,
        priceUSD: 1.0,
      },
    ];

    const result = calculateRequiredAssetAmount(
      assets,
      maxUse,
      mockWalletTokens,
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const requiredAmounts = result.unwrap();
      expect(requiredAmounts["0xtoken1"]).toBe(amount1 * 3n + fee1 * (1n + 3n));
      expect(requiredAmounts["0xtoken2"]).toBe(amount2 * 3n + fee2 * (1n + 3n));
    }
  });
});

describe("maxAmountForAsset", () => {
  it("should return the maximum amount available for an asset", () => {
    const fee = 10_000n;
    const mockWalletTokens: TokenWithPriceAndBalance[] = [
      {
        name: "token1",
        symbol: "TKN1",
        address: "0xtoken1",
        decimals: 8,
        enabled: true,
        fee: fee,
        is_default: false,
        balance: 1_000_000_000n,
        priceUSD: 1.0,
      },
    ];

    const maxAmountResult = maxAmountForAsset("0xtoken1", 1, mockWalletTokens);
    expect(maxAmountResult.isOk()).toBe(true);
    const maxAmount = maxAmountResult.unwrap();
    expect(maxAmount).toBe(1_000_000_000n - 2n * fee);
  });

  it("should return error if token is not found", () => {
    const mockWalletTokens: TokenWithPriceAndBalance[] = [];

    const maxAmountResult = maxAmountForAsset(
      "nonexistentToken",
      1,
      mockWalletTokens,
    );
    expect(maxAmountResult.isErr()).toBe(true);
  });
});
