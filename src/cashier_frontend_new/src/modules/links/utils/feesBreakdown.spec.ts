import { describe, it, expect, vi, beforeEach } from "vitest";
import { Ok, Err } from "ts-results-es";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import {
  calculateFeesBreakdown,
  calculateTotalFeesUsd,
  getLinkCreationFeeFromBreakdown,
  calculateAssetsWithTokenInfo,
  formatFeeBreakdownItem,
  formatLinkCreationFeeView,
  type FeeBreakdownItem,
} from "./feesBreakdown";
import { feeService } from "$modules/shared/services/feeService";

// Standard ICP Ledger Canister ID (use this if ICP_LEDGER_CANISTER_ID is undefined in tests)
const MOCK_ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
// Use the actual constant if available, otherwise fallback to mock
const TEST_ICP_LEDGER_CANISTER_ID =
  ICP_LEDGER_CANISTER_ID || MOCK_ICP_LEDGER_CANISTER_ID;

describe("feesBreakdown", () => {
  beforeEach(() => {
    // Mock feeService.getLinkCreationFee to always return the test ICP address
    vi.spyOn(feeService, "getLinkCreationFee").mockReturnValue({
      amount: 10_000n,
      tokenAddress: TEST_ICP_LEDGER_CANISTER_ID,
      symbol: "ICP",
      decimals: 8,
    });
  });

  const mockTokenICP: TokenWithPriceAndBalance = {
    name: "Internet Computer",
    address: TEST_ICP_LEDGER_CANISTER_ID,
    symbol: "ICP",
    decimals: 8,
    fee: 10_000n, // 0.0001 ICP
    priceUSD: 5.0,
    balance: 0n,
    enabled: true,
    is_default: true,
  };

  const mockTokenUSDC: TokenWithPriceAndBalance = {
    name: "USD Coin",
    address: "token-usdc-address",
    symbol: "USDC",
    decimals: 6,
    fee: 1_000n, // 0.001 USDC
    priceUSD: 1.0,
    balance: 0n,
    enabled: true,
    is_default: false,
  };

  describe("calculateFeesBreakdown", () => {
    it("should calculate network fees for each asset", () => {
      const assetAddresses = [
        TEST_ICP_LEDGER_CANISTER_ID,
        "token-usdc-address",
      ];
      const maxUse = 1;

      const linkCreationFeeInfo = feeService.getLinkCreationFee();

      const findTokenByAddress = vi.fn((address: string) => {
        // Handle both the asset addresses and the link creation fee token address
        // The function will be called for each asset address AND for the link creation fee token
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === linkCreationFeeInfo.tokenAddress ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(mockTokenICP);
        }
        if (address === "token-usdc-address") {
          return Ok(mockTokenUSDC);
        }
        return Err(new Error(`Token not found for address: ${address}`));
      });

      const result = calculateFeesBreakdown(
        assetAddresses,
        maxUse,
        findTokenByAddress,
      );

      // Should have: 2 network fees (ICP + USDC) + 1 link creation fee (ICP)
      expect(result).toHaveLength(3);

      // Check network fee for ICP
      const icpNetworkFee = result.find(
        (fee) =>
          fee.name === "Network fees" &&
          (fee.tokenAddress === TEST_ICP_LEDGER_CANISTER_ID ||
            fee.tokenAddress === MOCK_ICP_LEDGER_CANISTER_ID),
      );
      expect(icpNetworkFee).toBeDefined();
      expect(icpNetworkFee?.amount).toBe(10_000n);
      expect(icpNetworkFee?.tokenSymbol).toBe("ICP");
      expect(icpNetworkFee?.usdAmount).toBeCloseTo(0.0005); // 0.0001 * 5.0

      // Check network fee for USDC
      const usdcNetworkFee = result.find(
        (fee) =>
          fee.name === "Network fees" &&
          fee.tokenAddress === "token-usdc-address",
      );
      expect(usdcNetworkFee).toBeDefined();
      expect(usdcNetworkFee?.amount).toBe(1_000n);
      expect(usdcNetworkFee?.tokenSymbol).toBe("USDC");
      expect(usdcNetworkFee?.usdAmount).toBeCloseTo(0.001); // 0.001 * 1.0

      // Check link creation fee
      const linkCreationFee = result.find(
        (fee) => fee.name === "Link creation fee",
      );
      expect(linkCreationFee).toBeDefined();
      expect(linkCreationFee?.tokenAddress).toBe(
        TEST_ICP_LEDGER_CANISTER_ID || MOCK_ICP_LEDGER_CANISTER_ID,
      );
    });

    it("should multiply network fees by maxUse", () => {
      const assetAddresses = [TEST_ICP_LEDGER_CANISTER_ID];
      const maxUse = 5;

      const findTokenByAddress = vi.fn((address: string) => {
        // This will be called twice: once for network fee, once for link creation fee
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(mockTokenICP);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateFeesBreakdown(
        assetAddresses,
        maxUse,
        findTokenByAddress,
      );

      const networkFee = result.find(
        (fee) =>
          fee.name === "Network fees" &&
          (fee.tokenAddress === TEST_ICP_LEDGER_CANISTER_ID ||
            fee.tokenAddress === MOCK_ICP_LEDGER_CANISTER_ID),
      );
      expect(networkFee).toBeDefined();
      expect(networkFee?.amount).toBe(50_000n); // 10_000 * 5
    });

    it("should use maxUse = 1 when maxUse is 0", () => {
      const assetAddresses = [TEST_ICP_LEDGER_CANISTER_ID];
      const maxUse = 0;

      const findTokenByAddress = vi.fn((address: string) => {
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(mockTokenICP);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateFeesBreakdown(
        assetAddresses,
        maxUse,
        findTokenByAddress,
      );

      const networkFee = result.find(
        (fee) =>
          fee.name === "Network fees" &&
          (fee.tokenAddress === TEST_ICP_LEDGER_CANISTER_ID ||
            fee.tokenAddress === MOCK_ICP_LEDGER_CANISTER_ID),
      );
      expect(networkFee).toBeDefined();
      expect(networkFee?.amount).toBe(10_000n); // 10_000 * 1
    });

    it("should skip empty asset addresses", () => {
      const assetAddresses = ["", TEST_ICP_LEDGER_CANISTER_ID, ""];
      const maxUse = 1;

      const findTokenByAddress = vi.fn((address: string) => {
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(mockTokenICP);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateFeesBreakdown(
        assetAddresses,
        maxUse,
        findTokenByAddress,
      );

      // Should only have 1 network fee (for ICP) + 1 link creation fee
      const networkFees = result.filter((fee) => fee.name === "Network fees");
      expect(networkFees).toHaveLength(1);
      expect(result).toHaveLength(2); // 1 network fee + 1 link creation fee
    });

    it("should skip tokens that cannot be found", () => {
      const assetAddresses = [
        TEST_ICP_LEDGER_CANISTER_ID,
        "unknown-token-address",
      ];
      const maxUse = 1;

      const findTokenByAddress = vi.fn((address: string) => {
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(mockTokenICP);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateFeesBreakdown(
        assetAddresses,
        maxUse,
        findTokenByAddress,
      );

      // Should only have 1 network fee (for ICP) + 1 link creation fee
      const networkFees = result.filter((fee) => fee.name === "Network fees");
      expect(networkFees).toHaveLength(1);
      expect(result).toHaveLength(2); // 1 network fee + 1 link creation fee
    });

    it("should handle tokens without priceUSD (priceUSD = 0)", () => {
      const tokenWithoutPrice: TokenWithPriceAndBalance = {
        ...mockTokenICP,
        priceUSD: 0,
      };

      const assetAddresses = [TEST_ICP_LEDGER_CANISTER_ID];
      const maxUse = 1;

      const findTokenByAddress = vi.fn((address: string) => {
        // This will be called twice: once for network fee, once for link creation fee
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(tokenWithoutPrice);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateFeesBreakdown(
        assetAddresses,
        maxUse,
        findTokenByAddress,
      );

      const networkFee = result.find(
        (fee) =>
          fee.name === "Network fees" &&
          (fee.tokenAddress === TEST_ICP_LEDGER_CANISTER_ID ||
            fee.tokenAddress === MOCK_ICP_LEDGER_CANISTER_ID),
      );
      expect(networkFee).toBeDefined();
      expect(networkFee?.usdAmount).toBe(0);
    });

    it("should not add link creation fee if ICP token cannot be found", () => {
      const assetAddresses = ["token-usdc-address"];
      const maxUse = 1;

      const findTokenByAddress = vi.fn((address: string) => {
        if (address === "token-usdc-address") {
          return Ok(mockTokenUSDC);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateFeesBreakdown(
        assetAddresses,
        maxUse,
        findTokenByAddress,
      );

      const linkCreationFee = result.find(
        (fee) => fee.name === "Link creation fee",
      );
      expect(linkCreationFee).toBeUndefined();
      expect(result).toHaveLength(1); // Only network fee for USDC
    });
  });

  describe("calculateTotalFeesUsd", () => {
    it("should sum all USD amounts from breakdown", () => {
      const breakdown: FeeBreakdownItem[] = [
        {
          name: "Network fees",
          amount: 10_000n,
          tokenAddress: TEST_ICP_LEDGER_CANISTER_ID,
          tokenSymbol: "ICP",
          tokenDecimals: 8,
          usdAmount: 0.5,
        },
        {
          name: "Network fees",
          amount: 1_000n,
          tokenAddress: "token-usdc-address",
          tokenSymbol: "USDC",
          tokenDecimals: 6,
          usdAmount: 0.001,
        },
        {
          name: "Link creation fee",
          amount: 10_000n,
          tokenAddress: TEST_ICP_LEDGER_CANISTER_ID,
          tokenSymbol: "ICP",
          tokenDecimals: 8,
          usdAmount: 0.5,
        },
      ];

      const total = calculateTotalFeesUsd(breakdown);
      expect(total).toBeCloseTo(1.001);
    });

    it("should return 0 for empty breakdown", () => {
      const breakdown: FeeBreakdownItem[] = [];
      const total = calculateTotalFeesUsd(breakdown);
      expect(total).toBe(0);
    });
  });

  describe("getLinkCreationFeeFromBreakdown", () => {
    it("should return link creation fee from breakdown", () => {
      const breakdown: FeeBreakdownItem[] = [
        {
          name: "Network fees",
          amount: 10_000n,
          tokenAddress: TEST_ICP_LEDGER_CANISTER_ID,
          tokenSymbol: "ICP",
          tokenDecimals: 8,
          usdAmount: 0.5,
        },
        {
          name: "Link creation fee",
          amount: 10_000n,
          tokenAddress: TEST_ICP_LEDGER_CANISTER_ID,
          tokenSymbol: "ICP",
          tokenDecimals: 8,
          usdAmount: 0.5,
        },
      ];

      const linkCreationFee = getLinkCreationFeeFromBreakdown(breakdown);
      expect(linkCreationFee).toBeDefined();
      expect(linkCreationFee?.name).toBe("Link creation fee");
    });

    it("should return undefined if link creation fee is not in breakdown", () => {
      const breakdown: FeeBreakdownItem[] = [
        {
          name: "Network fees",
          amount: 10_000n,
          tokenAddress: TEST_ICP_LEDGER_CANISTER_ID,
          tokenSymbol: "ICP",
          tokenDecimals: 8,
          usdAmount: 0.5,
        },
      ];

      const linkCreationFee = getLinkCreationFeeFromBreakdown(breakdown);
      expect(linkCreationFee).toBeUndefined();
    });
  });

  describe("calculateAssetsWithTokenInfo", () => {
    it("should convert assets to assetsWithTokenInfo format", () => {
      const assets = [
        {
          address: TEST_ICP_LEDGER_CANISTER_ID,
          amount: 100_000_000n, // 1 ICP
        },
        {
          address: "token-usdc-address",
          amount: 1_000_000n, // 1 USDC
        },
      ];

      const findTokenByAddress = vi.fn((address: string) => {
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(mockTokenICP);
        }
        if (address === "token-usdc-address") {
          return Ok(mockTokenUSDC);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateAssetsWithTokenInfo(assets, findTokenByAddress);

      expect(result).toHaveLength(2);

      // Check ICP asset
      const icpAsset = result.find(
        (asset) => asset.address === TEST_ICP_LEDGER_CANISTER_ID,
      );
      expect(icpAsset).toBeDefined();
      expect(icpAsset?.amount).toBe(1);
      expect(icpAsset?.token.symbol).toBe("ICP");
      expect(icpAsset?.token.decimals).toBe(8);
      expect(icpAsset?.usdValue).toBe(5.0);
      expect(icpAsset?.logo).toBeDefined();

      // Check USDC asset
      const usdcAsset = result.find(
        (asset) => asset.address === "token-usdc-address",
      );
      expect(usdcAsset).toBeDefined();
      expect(usdcAsset?.amount).toBe(1);
      expect(usdcAsset?.token.symbol).toBe("USDC");
      expect(usdcAsset?.token.decimals).toBe(6);
      expect(usdcAsset?.usdValue).toBe(1.0);
    });

    it("should skip empty addresses", () => {
      const assets = [
        {
          address: "",
          amount: 100_000_000n,
        },
        {
          address: TEST_ICP_LEDGER_CANISTER_ID,
          amount: 100_000_000n,
        },
      ];

      const findTokenByAddress = vi.fn((address: string) => {
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(mockTokenICP);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateAssetsWithTokenInfo(assets, findTokenByAddress);

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe(TEST_ICP_LEDGER_CANISTER_ID);
    });

    it("should skip tokens that cannot be found", () => {
      const assets = [
        {
          address: "unknown-token",
          amount: 100_000_000n,
        },
        {
          address: TEST_ICP_LEDGER_CANISTER_ID,
          amount: 100_000_000n,
        },
      ];

      const findTokenByAddress = vi.fn((address: string) => {
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(mockTokenICP);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateAssetsWithTokenInfo(assets, findTokenByAddress);

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe(TEST_ICP_LEDGER_CANISTER_ID);
    });

    it("should handle tokens without priceUSD", () => {
      const tokenWithoutPrice: TokenWithPriceAndBalance = {
        ...mockTokenICP,
        priceUSD: 0,
      };

      const assets = [
        {
          address: TEST_ICP_LEDGER_CANISTER_ID,
          amount: 100_000_000n,
        },
      ];

      const findTokenByAddress = vi.fn((address: string) => {
        if (
          address === TEST_ICP_LEDGER_CANISTER_ID ||
          address === MOCK_ICP_LEDGER_CANISTER_ID
        ) {
          return Ok(tokenWithoutPrice);
        }
        return Err(new Error("Token not found"));
      });

      const result = calculateAssetsWithTokenInfo(assets, findTokenByAddress);

      expect(result).toHaveLength(1);
      expect(result[0].usdValue).toBe(0);
      expect(result[0].token.priceUSD).toBe(0);
    });
  });

  describe("formatFeeBreakdownItem", () => {
    it("should format fee breakdown item for display", () => {
      const fee: FeeBreakdownItem = {
        name: "Network fees",
        amount: 10_000n,
        tokenAddress: TEST_ICP_LEDGER_CANISTER_ID,
        tokenSymbol: "ICP",
        tokenDecimals: 8,
        usdAmount: 0.5,
      };

      const formatted = formatFeeBreakdownItem(fee);

      expect(formatted.name).toBe("Network fees");
      expect(formatted.amount).toBe(10_000n);
      expect(formatted.tokenAddress).toBe(TEST_ICP_LEDGER_CANISTER_ID);
      expect(formatted.tokenSymbol).toBe("ICP");
      expect(formatted.tokenDecimals).toBe(8);
      expect(formatted.usdAmount).toBe(0.5);
      expect(formatted.tokenLogo).toBeDefined();
      expect(formatted.feeAmount).toBe(0.0001);
      expect(typeof formatted.feeAmountFormatted).toBe("string");
      expect(typeof formatted.usdFormatted).toBe("string");
    });
  });

  describe("formatLinkCreationFeeView", () => {
    it("should format link creation fee for display", () => {
      const fee: FeeBreakdownItem = {
        name: "Link creation fee",
        amount: 10_000n,
        tokenAddress: TEST_ICP_LEDGER_CANISTER_ID,
        tokenSymbol: "ICP",
        tokenDecimals: 8,
        usdAmount: 0.5,
      };

      const formatted = formatLinkCreationFeeView(fee);

      expect(formatted).toBeDefined();
      expect(formatted?.name).toBe("Link creation fee");
    });

    it("should return null if fee is undefined", () => {
      const formatted = formatLinkCreationFeeView(undefined);
      expect(formatted).toBeNull();
    });
  });
});
