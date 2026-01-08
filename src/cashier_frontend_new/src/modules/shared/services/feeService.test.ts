import { describe, it, expect } from "vitest";
import { feeService } from "./feeService";
import { FeeType } from "$modules/links/types/fee";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import type { AssetAndFeeList } from "../types/feeService";

describe("FeeService", () => {
  describe("getTotalFeeUsd", () => {
    it("should sum fee.usdValue from all assets", () => {
      const assets: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_010_000n,
            amountFormattedStr: "0.0101",
            usdValueStr: "$0.10",
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
            state: AssetProcessState.PENDING,
            label: "Create link fee",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 30_000n,
            amountFormattedStr: "0.0003",
            usdValueStr: "$0.003",
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
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_000_000n,
            amountFormattedStr: "0.01",
            usdValueStr: "$0.10",
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
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_010_000n,
            amountFormattedStr: "0.0101",
            usdValueStr: "$0.10",
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
});
