import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkType } from "../types/link/linkType";
import { validationService } from "./validationService";
import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/creationLink/types/createLinkData";

describe("validateRequiredAmount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return an error if no assets are provided", () => {
    const mockWalletTokens: TokenWithPriceAndBalance[] = [];
    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("No assets provided for validation");
    }
  });

  it("should return an error if wallet tokens data is not available", () => {
    const mockWalletTokens: TokenWithPriceAndBalance[] = [];
    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken1", 1000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("Wallet tokens data is not available");
    }
  });

  it("should return an error if token is not found in wallet", () => {
    // mock walletStore to have token with insufficient balance
    const mockWalletTokens: TokenWithPriceAndBalance[] = [
      {
        name: "token1",
        symbol: "TKN1",
        address: "0xtoken1",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 1_000_000n,
        priceUSD: 1.0,
      },
    ];

    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken2", 1_000_000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        "Token with address 0xtoken2 not found in wallet",
      );
    }
  });

  it("should return an error if insufficient amount for an asset", () => {
    // mock walletStore to have token with insufficient balance
    const mockWalletTokens: TokenWithPriceAndBalance[] = [
      {
        name: "token1",
        symbol: "TKN1",
        address: "0xtoken1",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 1_000_000n,
        priceUSD: 1.0,
      },
      {
        name: "token2",
        symbol: "TKN2",
        address: "0xtoken2",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 5_000_000n,
        priceUSD: 1.0,
      },
    ];

    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken1", 1_000_000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        "Insufficient amount for asset 0xtoken1, required: 2030000, available: 1000000",
      );
    }
  });

  it("should validate successfully when sufficient amounts are available", () => {
    // mock walletStore to have token with insufficient balance
    const mockWalletTokens: TokenWithPriceAndBalance[] = [
      {
        name: "token1",
        symbol: "TKN1",
        address: "0xtoken1",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 3_000_000n,
        priceUSD: 1.0,
      },
      {
        name: "token2",
        symbol: "TKN2",
        address: "0xtoken2",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 5_000_000n,
        priceUSD: 1.0,
      },
    ];

    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken1", 1_000_000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isOk()).toBe(true);
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

    const maxAmountResult = validationService.maxAmountForAsset(
      "0xtoken1",
      1,
      mockWalletTokens,
    );
    expect(maxAmountResult.isOk()).toBe(true);
    const maxAmount = maxAmountResult.unwrap();
    expect(maxAmount).toBe(1_000_000_000n - 2n * fee);
  });

  it("should return error if token is not found", () => {
    const mockWalletTokens: TokenWithPriceAndBalance[] = [];

    const maxAmountResult = validationService.maxAmountForAsset(
      "nonexistentToken",
      1,
      mockWalletTokens,
    );
    expect(maxAmountResult.isErr()).toBe(true);
  });
});
