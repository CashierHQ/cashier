import { describe, it, expect } from "vitest";
import { feeService } from "./feeService";
import { FeeType } from "$modules/links/types/fee";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import type { AssetAndFeeList } from "$modules/shared/types/feeService";
import { FlowDirection } from "$modules/transactionCart/types/transaction-source";

describe("FeeService", () => {
  describe("getTotalFeeUsd", () => {
    it("should sum fee.usdValue from all assets", () => {
      const assets: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PROCESSING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_010_000n,
            amountFormattedStr: "0.0101",
            usdValueStr: "$0.10",
            direction: FlowDirection.OUTGOING,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: 10_000n,
            amountFormattedStr: "0.0001",
            symbol: "ICP",
            usdValue: 0.001,
          },
        },
        {
          asset: {
            state: AssetProcessState.PROCESSING,
            label: "Create link fee",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 30_000n,
            amountFormattedStr: "0.0003",
            usdValueStr: "$0.003",
            direction: FlowDirection.OUTGOING,
          },
          fee: {
            feeType: FeeType.CREATE_LINK_FEE,
            amount: 30_000n,
            amountFormattedStr: "0.0003",
            symbol: "ICP",
            usdValue: 0.003,
          },
        },
      ];

      expect(feeService.getTotalFeeUsd(assets)).toBe(0.004);
    });

    it("should return 0 when no fees", () => {
      const assets: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PROCESSING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_000_000n,
            amountFormattedStr: "0.01",
            usdValueStr: "$0.10",
            direction: FlowDirection.OUTGOING,
          },
          // No fee
        },
      ];

      expect(feeService.getTotalFeeUsd(assets)).toBe(0);
    });

    it("should return 0 for empty array", () => {
      expect(feeService.getTotalFeeUsd([])).toBe(0);
    });

    it("should handle undefined usdValue gracefully", () => {
      const assets: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PROCESSING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_010_000n,
            amountFormattedStr: "0.0101",
            usdValueStr: "$0.10",
            direction: FlowDirection.OUTGOING,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: 10_000n,
            amountFormattedStr: "0.0001",
            symbol: "ICP",
            // usdValue intentionally undefined
          },
        },
      ];

      expect(feeService.getTotalFeeUsd(assets)).toBe(0);
    });
  });

  describe("mapWalletToAssetAndFeeList", () => {
    const mockTokens = {
      "token-addr": {
        address: "token-addr",
        symbol: "TKN",
        decimals: 8,
        fee: 10_000n,
        priceUSD: 1.5,
        balance: 100_000_000n,
        name: "Test Token",
        logo: "",
      },
    };

    it("returns AssetAndFee array for valid input", () => {
      const result = feeService.mapWalletToAssetAndFeeList(
        { amount: 1_000_000n, tokenAddress: "token-addr" },
        mockTokens,
      );

      expect(result).toHaveLength(1);
      expect(result[0].asset.amount).toBe(1_010_000n); // amount + fee
      expect(result[0].asset.state).toBe(AssetProcessState.CREATED);
      expect(result[0].asset.direction).toBe(FlowDirection.OUTGOING);
      expect(result[0].fee?.amount).toBe(10_000n);
    });

    it("returns empty array for unknown token", () => {
      const result = feeService.mapWalletToAssetAndFeeList(
        { amount: 1_000_000n, tokenAddress: "unknown" },
        mockTokens,
      );
      expect(result).toHaveLength(0);
    });

    it("uses token fee from tokens map", () => {
      const tokensWithCustomFee = {
        "token-addr": { ...mockTokens["token-addr"], fee: 5_000n },
      };
      const result = feeService.mapWalletToAssetAndFeeList(
        { amount: 1_000_000n, tokenAddress: "token-addr" },
        tokensWithCustomFee,
      );
      expect(result[0].fee?.amount).toBe(5_000n);
      expect(result[0].asset.amount).toBe(1_005_000n); // amount + custom fee
    });

    it("calculates USD values when priceUSD available", () => {
      const result = feeService.mapWalletToAssetAndFeeList(
        { amount: 1_000_000n, tokenAddress: "token-addr" },
        mockTokens,
      );
      expect(result[0].asset.usdValueStr).toBeDefined();
      expect(result[0].fee?.usdValue).toBeDefined();
    });

    it("handles token without priceUSD", () => {
      const tokensWithoutPrice = {
        "token-addr": { ...mockTokens["token-addr"], priceUSD: undefined },
      };
      const result = feeService.mapWalletToAssetAndFeeList(
        { amount: 1_000_000n, tokenAddress: "token-addr" },
        tokensWithoutPrice,
      );
      expect(result[0].asset.usdValueStr).toBeUndefined();
      expect(result[0].fee?.usdValue).toBeUndefined();
    });

    it("sets correct asset properties", () => {
      const result = feeService.mapWalletToAssetAndFeeList(
        { amount: 1_000_000n, tokenAddress: "token-addr" },
        mockTokens,
      );
      const asset = result[0].asset;
      expect(asset.symbol).toBe("TKN");
      expect(asset.address).toBe("token-addr");
      expect(asset.label).toBe("");
      expect(asset.amountFormattedStr).toBeDefined();
    });

    it("sets correct fee properties", () => {
      const result = feeService.mapWalletToAssetAndFeeList(
        { amount: 1_000_000n, tokenAddress: "token-addr" },
        mockTokens,
      );
      const fee = result[0].fee;
      expect(fee?.feeType).toBe(FeeType.NETWORK_FEE);
      expect(fee?.symbol).toBe("TKN");
      expect(fee?.amountFormattedStr).toBeDefined();
    });
  });
});
