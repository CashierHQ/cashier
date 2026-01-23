import { describe, it, expect } from "vitest";
import { getAssetWithTokenInfo } from "./getAssetWithTokenInfo";
import { AssetInfo, Asset } from "$modules/links/types/link/asset";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";

describe("getAssetWithTokenInfo", () => {
  const mockPrincipal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
  const mockAssetInfo = new AssetInfo(
    Asset.IC(mockPrincipal),
    1000000n, // 0.01 with 8 decimals
    "Test Token",
  );

  const mockWalletToken: TokenWithPriceAndBalance = {
    name: "Test Token",
    symbol: "TEST",
    address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    decimals: 8,
    enabled: true,
    fee: 10000n,
    is_default: false,
    balance: 100000000n,
    priceUSD: 10.5,
  };

  it("should use walletToken symbol and decimals when available", () => {
    const result = getAssetWithTokenInfo(
      mockAssetInfo,
      mockWalletToken,
      undefined,
    );

    expect(result.symbol).toBe("TEST");
    expect(result.decimals).toBe(8);
    expect(result.amount).toBe(0.01);
    expect(result.priceUSD).toBe(10.5);
    expect(result.usdValue).toBe(0.01 * 10.5);
    expect(result.address).toBe("ryjl3-tyaaa-aaaaa-aaaba-cai");
  });

  it("should fall back to tokenMeta when walletToken is not available", () => {
    const mockTokenMeta: IcrcTokenMetadata = {
      symbol: ["META"],
      decimals: [6],
    } as unknown as IcrcTokenMetadata;

    const result = getAssetWithTokenInfo(
      mockAssetInfo,
      undefined,
      mockTokenMeta,
    );

    expect(result.symbol).toBe("META");
    expect(result.decimals).toBe(6);
    expect(result.amount).toBe(1); // 1000000n with 6 decimals = 1
    expect(result.priceUSD).toBeUndefined();
    expect(result.usdValue).toBe(0);
  });

  it("should fall back to assetInfo.label when neither walletToken nor tokenMeta is available", () => {
    const result = getAssetWithTokenInfo(mockAssetInfo, undefined, undefined);

    expect(result.symbol).toBe("Test Token");
    expect(result.decimals).toBe(8);
    expect(result.amount).toBe(0.01);
    expect(result.priceUSD).toBeUndefined();
    expect(result.usdValue).toBe(0);
  });

  it("should fall back to 'TOKEN' when no symbol sources are available", () => {
    const assetInfoWithoutLabel = new AssetInfo(
      Asset.IC(mockPrincipal),
      1000000n,
      "",
    );

    const result = getAssetWithTokenInfo(
      assetInfoWithoutLabel,
      undefined,
      undefined,
    );

    expect(result.symbol).toBe("TOKEN");
  });

  it("should handle tokenMeta with string symbol", () => {
    const mockTokenMeta: IcrcTokenMetadata = {
      symbol: "STRING_SYMBOL",
      decimals: [4],
    } as unknown as IcrcTokenMetadata;

    const result = getAssetWithTokenInfo(
      mockAssetInfo,
      undefined,
      mockTokenMeta,
    );

    expect(result.symbol).toBe("STRING_SYMBOL");
    expect(result.decimals).toBe(4);
  });

  it("should handle tokenMeta with empty arrays", () => {
    const mockTokenMeta: IcrcTokenMetadata = {
      symbol: [],
      decimals: [],
    } as unknown as IcrcTokenMetadata;

    const result = getAssetWithTokenInfo(
      mockAssetInfo,
      undefined,
      mockTokenMeta,
    );

    expect(result.symbol).toBe("Test Token"); // Falls back to label
    expect(result.decimals).toBe(8); // Falls back to default
  });

  it("should calculate usdValue correctly when priceUSD is available", () => {
    const result = getAssetWithTokenInfo(
      mockAssetInfo,
      mockWalletToken,
      undefined,
    );

    expect(result.usdValue).toBe(0.01 * 10.5);
  });

  it("should return usdValue as 0 when priceUSD is not available", () => {
    const walletTokenWithoutPrice: TokenWithPriceAndBalance = {
      ...mockWalletToken,
      priceUSD: undefined as unknown as number,
    };

    const result = getAssetWithTokenInfo(
      mockAssetInfo,
      walletTokenWithoutPrice,
      undefined,
    );

    expect(result.usdValue).toBe(0);
  });

  it("should handle different decimal values correctly", () => {
    const assetWithDifferentDecimals = new AssetInfo(
      Asset.IC(mockPrincipal),
      123456789n, // 1.23456789 with 8 decimals
      "Test",
    );

    const result = getAssetWithTokenInfo(
      assetWithDifferentDecimals,
      mockWalletToken,
      undefined,
    );

    expect(result.amount).toBeCloseTo(1.23456789);
  });

  it("should extract address from Principal correctly", () => {
    const result = getAssetWithTokenInfo(
      mockAssetInfo,
      mockWalletToken,
      undefined,
    );

    expect(result.address).toBe("ryjl3-tyaaa-aaaaa-aaaba-cai");
  });

  it("should return logo URL", () => {
    // Use a non-ICP address to test icexplorer URL
    // Using a valid Principal ID (SNS governance canister)
    const nonIcpPrincipal = Principal.fromText("zfcdd-tqaaa-aaaaq-aaaga-cai");
    const nonIcpAssetInfo = new AssetInfo(
      Asset.IC(nonIcpPrincipal),
      1000000n,
      "Other Token",
    );

    const result = getAssetWithTokenInfo(
      nonIcpAssetInfo,
      mockWalletToken,
      undefined,
    );

    expect(result.logo).toBe(
      "https://api.icexplorer.io/images/zfcdd-tqaaa-aaaaq-aaaga-cai",
    );
  });

  it("should return ICP logo for ICP ledger canister ID", () => {
    // Use a valid ICP ledger canister ID (fallback if env var is not set)
    const icpCanisterId =
      ICP_LEDGER_CANISTER_ID || "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const icpPrincipal = Principal.fromText(icpCanisterId);
    const icpAssetInfo = new AssetInfo(Asset.IC(icpPrincipal), 1000000n, "ICP");

    const result = getAssetWithTokenInfo(
      icpAssetInfo,
      mockWalletToken,
      undefined,
    );

    // getTokenLogo should return /icpLogo.png for ICP ledger canister ID
    // If ICP_LEDGER_CANISTER_ID is undefined in tests, it will fallback to icexplorer URL
    if (ICP_LEDGER_CANISTER_ID) {
      expect(result.logo).toBe("/icpLogo.png");
    } else {
      // If env var is not set, it will use icexplorer URL
      expect(result.logo).toBe(
        `https://api.icexplorer.io/images/${icpCanisterId}`,
      );
    }
  });

  it("should prioritize walletToken over tokenMeta", () => {
    const mockTokenMeta: IcrcTokenMetadata = {
      symbol: ["META"],
      decimals: [6],
    } as unknown as IcrcTokenMetadata;

    const result = getAssetWithTokenInfo(
      mockAssetInfo,
      mockWalletToken,
      mockTokenMeta,
    );

    // Should use walletToken values
    expect(result.symbol).toBe("TEST");
    expect(result.decimals).toBe(8);
    expect(result.priceUSD).toBe(10.5);
  });
});
