// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { describe, expect, it } from "vitest";
import { calculateExactDisplayAmounts } from "./calculateExactDisplayAmounts";
import { LinkType } from "$modules/links/types/link/linkType";
import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";
import { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

describe("calculateExactDisplayAmounts", () => {
  const createMockAsset = (
    address: string,
    amount: string,
    usdValueStr?: string,
  ): { asset: ForecastAssetAndFee["asset"] } => ({
    asset: {
      label: "Test Asset",
      symbol: "TEST",
      address,
      amount,
      usdValueStr,
    },
  });

  const createMockToken = (
    address: string,
    decimals: number = 8,
    priceUSD?: number,
  ): TokenWithPriceAndBalance => ({
    name: "Test Token",
    symbol: "TEST",
    address,
    decimals,
    enabled: true,
    fee: 1000n,
    is_default: false,
    balance: 1000000000n,
    priceUSD,
  });

  describe("for AIRDROP links with maxUse > 1", () => {
    it("should calculate exact total using useAmount * maxUse", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "4.999895", "5.0")];
      const linkAssets = [
        new CreateLinkAsset("0xtoken1", 499989500n), // 4.999895 with 8 decimals
      ];
      const walletTokens = [createMockToken("0xtoken1", 8, 1.0)];
      const maxUse = 20;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      // 4.999895 * 20 = 99.9979 (exact calculation)
      expect(result.amounts.get("0xtoken1")).toBe("99.9979");
      // USD: 99.9979 * 1.0 = 99.9979, rounded to 4 decimals = 99.9979
      expect(result.usdAmounts.get("0xtoken1")).toBe("99.9979");
    });

    it("should handle different decimals correctly", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "100.5", "50.25")];
      const linkAssets = [
        new CreateLinkAsset("0xtoken1", 100500000000n), // 100.5 with 9 decimals
      ];
      const walletTokens = [createMockToken("0xtoken1", 9, 0.5)];
      const maxUse = 3;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      // 100.5 * 3 = 301.5 (exact calculation)
      expect(result.amounts.get("0xtoken1")).toBe("301.5");
      expect(result.usdAmounts.get("0xtoken1")).toBe("150.75");
    });

    it("should handle zero useAmount", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "0", "0")];
      const linkAssets = [new CreateLinkAsset("0xtoken1", 0n)];
      const walletTokens = [createMockToken("0xtoken1", 8)];
      const maxUse = 5;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      expect(result.amounts.get("0xtoken1")).toBe("0");
    });

    it("should fallback to original values if linkAsset not found", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "100", "50")];
      const linkAssets = [new CreateLinkAsset("0xtoken2", 100000000n)];
      const walletTokens = [createMockToken("0xtoken1", 8)];
      const maxUse = 2;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      // Should use original values since linkAsset not found
      expect(result.amounts.get("0xtoken1")).toBe("100");
      expect(result.usdAmounts.get("0xtoken1")).toBe("50");
    });

    it("should handle missing token in walletTokens", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "10", "5")];
      const linkAssets = [new CreateLinkAsset("0xtoken1", 1000000000n)];
      const walletTokens: TokenWithPriceAndBalance[] = [];
      const maxUse = 2;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      // Should use default decimals (8) if token not found
      expect(result.amounts.get("0xtoken1")).toBe("20");
    });

    it("should handle missing USD value when priceUSD is not available", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "10")];
      const linkAssets = [new CreateLinkAsset("0xtoken1", 1000000000n)];
      const walletTokens = [createMockToken("0xtoken1", 8, undefined)];
      const maxUse = 2;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      expect(result.amounts.get("0xtoken1")).toBe("20");
      expect(result.usdAmounts.get("0xtoken1")).toBeUndefined();
    });

    it("should calculate USD value from exact token amount and priceUSD", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "0.0145", "0.0145")];
      const linkAssets = [
        new CreateLinkAsset("0xtoken1", 1450000n), // 0.0145 with 8 decimals
      ];
      const walletTokens = [createMockToken("0xtoken1", 8, 1.0)];
      const maxUse = 20;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      // 0.0145 * 20 = 0.29 (exact calculation)
      expect(result.amounts.get("0xtoken1")).toBe("0.29");
      // USD: 0.29 * 1.0 = 0.29
      expect(result.usdAmounts.get("0xtoken1")).toBe("0.29");
    });
  });

  describe("for non-AIRDROP links", () => {
    it("should return original values for TIP links", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "100", "50")];
      const linkAssets = [new CreateLinkAsset("0xtoken1", 10000000000n)];
      const walletTokens = [createMockToken("0xtoken1", 8)];
      const maxUse = 5;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.TIP,
        maxUse,
        walletTokens,
      });

      // Should use original values, not multiplied
      expect(result.amounts.get("0xtoken1")).toBe("100");
      expect(result.usdAmounts.get("0xtoken1")).toBe("50");
    });

    it("should return original values for AIRDROP with maxUse <= 1", () => {
      const assetsToDisplay = [createMockAsset("0xtoken1", "100", "50")];
      const linkAssets = [new CreateLinkAsset("0xtoken1", 10000000000n)];
      const walletTokens = [createMockToken("0xtoken1", 8)];
      const maxUse = 1;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      // Should use original values, not multiplied
      expect(result.amounts.get("0xtoken1")).toBe("100");
      expect(result.usdAmounts.get("0xtoken1")).toBe("50");
    });
  });

  describe("edge cases", () => {
    it("should handle empty assetsToDisplay", () => {
      const result = calculateExactDisplayAmounts({
        assetsToDisplay: [],
        linkAssets: [],
        linkType: LinkType.AIRDROP,
        maxUse: 5,
        walletTokens: [],
      });

      expect(result.amounts.size).toBe(0);
      expect(result.usdAmounts.size).toBe(0);
    });

    it("should handle multiple assets", () => {
      const assetsToDisplay = [
        createMockAsset("0xtoken1", "10", "5"),
        createMockAsset("0xtoken2", "20", "10"),
      ];
      const linkAssets = [
        new CreateLinkAsset("0xtoken1", 1000000000n),
        new CreateLinkAsset("0xtoken2", 2000000000n),
      ];
      const walletTokens = [
        createMockToken("0xtoken1", 8, 0.5),
        createMockToken("0xtoken2", 8, 0.5),
      ];
      const maxUse = 3;

      const result = calculateExactDisplayAmounts({
        assetsToDisplay,
        linkAssets,
        linkType: LinkType.AIRDROP,
        maxUse,
        walletTokens,
      });

      expect(result.amounts.get("0xtoken1")).toBe("30");
      expect(result.amounts.get("0xtoken2")).toBe("60");
      expect(result.usdAmounts.get("0xtoken1")).toBe("15");
      expect(result.usdAmounts.get("0xtoken2")).toBe("30");
    });
  });
});
