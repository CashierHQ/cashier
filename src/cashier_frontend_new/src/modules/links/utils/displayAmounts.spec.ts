import { describe, expect, it } from "vitest";
import { calculateDisplayAmounts } from "./displayAmounts";
import { LinkType } from "$modules/links/types/link/linkType";
import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";

describe("calculateDisplayAmounts", () => {
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

  describe("for AIRDROP links with maxUse > 1", () => {
    it("should multiply token amounts by maxUse", () => {
      const assets = [
        createMockAsset("0xtoken1", "100.5", "50.25"),
        createMockAsset("0xtoken2", "200", "100"),
      ];
      const maxUse = 3;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("301.5");
      expect(result.amounts.get("0xtoken2")).toBe("600");
    });

    it("should multiply USD amounts by maxUse", () => {
      const assets = [
        createMockAsset("0xtoken1", "100", "50.5"),
        createMockAsset("0xtoken2", "200", "100.25"),
      ];
      const maxUse = 2;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.usdAmounts.get("0xtoken1")).toBe("101");
      expect(result.usdAmounts.get("0xtoken2")).toBe("200.5");
    });

    it("should handle decimal amounts correctly", () => {
      const assets = [createMockAsset("0xtoken1", "0.123456", "0.061728")];
      const maxUse = 5;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("0.61728");
      // Floating point precision may cause slight differences
      const usdValue = result.usdAmounts.get("0xtoken1");
      expect(usdValue).toBeDefined();
      expect(parseFloat(usdValue!)).toBeCloseTo(0.30864, 5);
    });

    it("should handle formatted amounts with commas", () => {
      const assets = [createMockAsset("0xtoken1", "1,000.5", "500.25")];
      const maxUse = 2;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      // formatNumber adds commas for numbers >= 1000
      expect(result.amounts.get("0xtoken1")).toBe("2,001");
      expect(result.usdAmounts.get("0xtoken1")).toBe("1000.5");
    });

    it("should preserve original amount if parsing fails", () => {
      const assets = [createMockAsset("0xtoken1", "invalid", "50")];
      const maxUse = 3;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("invalid");
    });

    it("should preserve original USD value if parsing fails", () => {
      const assets = [createMockAsset("0xtoken1", "100", "invalid")];
      const maxUse = 2;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.usdAmounts.get("0xtoken1")).toBe("invalid");
    });

    it("should not multiply when maxUse is 1", () => {
      const assets = [createMockAsset("0xtoken1", "100", "50")];
      const maxUse = 1;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("100");
      expect(result.usdAmounts.get("0xtoken1")).toBe("50");
    });
  });

  describe("for non-AIRDROP links", () => {
    it("should return original amounts without multiplication", () => {
      const assets = [
        createMockAsset("0xtoken1", "100.5", "50.25"),
        createMockAsset("0xtoken2", "200", "100"),
      ];
      const maxUse = 5;

      const result = calculateDisplayAmounts(assets, LinkType.TIP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("100.5");
      expect(result.amounts.get("0xtoken2")).toBe("200");
      expect(result.usdAmounts.get("0xtoken1")).toBe("50.25");
      expect(result.usdAmounts.get("0xtoken2")).toBe("100");
    });

    it("should handle TIP link type", () => {
      const assets = [createMockAsset("0xtoken1", "50", "25")];
      const maxUse = 10;

      const result = calculateDisplayAmounts(assets, LinkType.TIP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("50");
      expect(result.usdAmounts.get("0xtoken1")).toBe("25");
    });

    it("should handle TOKEN_BASKET link type", () => {
      const assets = [
        createMockAsset("0xtoken1", "10", "5"),
        createMockAsset("0xtoken2", "20", "10"),
      ];
      const maxUse = 3;

      const result = calculateDisplayAmounts(
        assets,
        LinkType.TOKEN_BASKET,
        maxUse,
      );

      expect(result.amounts.get("0xtoken1")).toBe("10");
      expect(result.amounts.get("0xtoken2")).toBe("20");
    });
  });

  describe("edge cases", () => {
    it("should handle empty assets array", () => {
      const result = calculateDisplayAmounts([], LinkType.AIRDROP, 5);

      expect(result.amounts.size).toBe(0);
      expect(result.usdAmounts.size).toBe(0);
    });

    it("should handle undefined linkType", () => {
      const assets = [createMockAsset("0xtoken1", "100", "50")];
      const maxUse = 3;

      const result = calculateDisplayAmounts(assets, undefined, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("100");
      expect(result.usdAmounts.get("0xtoken1")).toBe("50");
    });

    it("should handle assets without USD values", () => {
      const assets = [
        createMockAsset("0xtoken1", "100"),
        createMockAsset("0xtoken2", "200", "100"),
      ];
      const maxUse = 2;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("200");
      expect(result.usdAmounts.has("0xtoken1")).toBe(false);
      expect(result.amounts.get("0xtoken2")).toBe("400");
      expect(result.usdAmounts.get("0xtoken2")).toBe("200");
    });

    it("should handle zero amounts", () => {
      const assets = [createMockAsset("0xtoken1", "0", "0")];
      const maxUse = 5;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("0");
      expect(result.usdAmounts.get("0xtoken1")).toBe("0");
    });

    it("should handle negative amounts (preserved as-is if parsing fails)", () => {
      const assets = [createMockAsset("0xtoken1", "-100", "-50")];
      const maxUse = 2;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      expect(result.amounts.get("0xtoken1")).toBe("-200");
      expect(result.usdAmounts.get("0xtoken1")).toBe("-100");
    });

    it("should handle very large maxUse values", () => {
      const assets = [createMockAsset("0xtoken1", "1", "0.5")];
      const maxUse = 1000;

      const result = calculateDisplayAmounts(assets, LinkType.AIRDROP, maxUse);

      // formatNumber adds commas for numbers >= 1000
      expect(result.amounts.get("0xtoken1")).toBe("1,000");
      expect(result.usdAmounts.get("0xtoken1")).toBe("500");
    });
  });
});
