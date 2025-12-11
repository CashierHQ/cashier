import { describe, expect, it } from "vitest";
import { Asset, AssetInfo } from "$modules/links/types/link/asset";
import { Principal } from "@dfinity/principal";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { getFirstAssetDisplayInfo } from "./getFirstAssetDisplayInfo";

describe("getFirstAssetDisplayInfo", () => {
  const mockPrincipal = Principal.fromText("aaaaa-aa");
  const mockAsset = Asset.IC(mockPrincipal);
  const mockAssetInfo = new AssetInfo(mockAsset, 1000000n, "Test Token");

  const mockWalletToken: TokenWithPriceAndBalance = {
    name: "Test Token",
    symbol: "TKN",
    address: "aaaaa-aa",
    decimals: 8,
    enabled: true,
    fee: 10000n,
    is_default: false,
    balance: 1000000n,
    priceUSD: 1.0,
  };

  const mockTokenMeta = {
    symbol: ["META"],
    name: ["Meta Token"],
    decimals: [6],
    fee: [10000n],
  } as unknown as IcrcTokenMetadata;

  it("returns null when assetInfo is null", () => {
    const result = getFirstAssetDisplayInfo(null);
    expect(result).toBeNull();
  });

  it("returns null when assetInfo is undefined", () => {
    const result = getFirstAssetDisplayInfo(undefined);
    expect(result).toBeNull();
  });

  it("returns null when tokenAddress cannot be derived", () => {
    // Create an asset with undefined address
    const assetWithoutAddress = new AssetInfo(
      Asset.IC(mockPrincipal),
      1000000n,
      "Test",
    );
    // Mock the address to be undefined by overriding the asset
    const assetWithUndefinedAddress = {
      ...assetWithoutAddress,
      asset: {
        ...assetWithoutAddress.asset,
        address: undefined,
      },
    };
    const result = getFirstAssetDisplayInfo(assetWithUndefinedAddress);
    expect(result).toBeNull();
  });

  it("uses walletToken symbol and decimals when available", () => {
    const result = getFirstAssetDisplayInfo(
      mockAssetInfo,
      mockWalletToken,
      null,
    );

    expect(result).not.toBeNull();
    expect(result?.tokenAddress).toBe("aaaaa-aa");
    expect(result?.symbol).toBe("TKN");
    expect(result?.amount).toBe(0.01);
  });

  it("falls back to tokenMeta symbol and decimals when walletToken is not available", () => {
    const result = getFirstAssetDisplayInfo(mockAssetInfo, null, mockTokenMeta);

    expect(result).not.toBeNull();
    expect(result?.tokenAddress).toBe("aaaaa-aa");
    expect(result?.symbol).toBe("META");
    expect(result?.amount).toBe(1);
  });

  it("falls back to default 'TOKEN' when neither walletToken nor tokenMeta is available", () => {
    const result = getFirstAssetDisplayInfo(mockAssetInfo, null, null);

    expect(result).not.toBeNull();
    expect(result?.tokenAddress).toBe("aaaaa-aa");
    expect(result?.symbol).toBe("TOKEN");
    expect(result?.amount).toBe(0.01); // default decimals is 8
  });

  it("returns correct amount for exact values", () => {
    const assetWithExactAmount = new AssetInfo(
      mockAsset,
      100000000n, // 1.0 with 8 decimals
      "Test",
    );
    const result = getFirstAssetDisplayInfo(
      assetWithExactAmount,
      mockWalletToken,
      null,
    );

    expect(result?.amount).toBe(1);
  });

  it("handles amounts with decimals correctly", () => {
    const assetWithDecimals = new AssetInfo(
      mockAsset,
      123456789n, // 1.23456789 with 8 decimals
      "Test",
    );
    const result = getFirstAssetDisplayInfo(
      assetWithDecimals,
      mockWalletToken,
      null,
    );

    expect(result?.amount).toBeCloseTo(1.23456789);
  });

  it("prefers walletToken over tokenMeta when both are available", () => {
    const result = getFirstAssetDisplayInfo(
      mockAssetInfo,
      mockWalletToken,
      mockTokenMeta,
    );

    expect(result?.symbol).toBe("TKN"); // from walletToken, not tokenMeta
    expect(result?.amount).toBe(0.01); // using walletToken decimals (8)
  });
});
