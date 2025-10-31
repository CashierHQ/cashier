import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateLinkAsset, CreateLinkData } from "../types/createLinkData";
import { LinkType } from "../types/link/linkType";
import { validationService } from "./validationService";

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

describe("maxAmountPerAsset", () => {
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

    const result = validationService.maxAmountPerAsset(
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

    const result = validationService.maxAmountPerAsset(
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

    const result = validationService.maxAmountPerAsset(
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

  it("should calculate max amounts per asset successfully", () => {
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
      assets: [new CreateLinkAsset("0xtoken1", 0n)],
      maxUse: 2,
    });

    const result = validationService.maxAmountPerAsset(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isOk()).toBe(true);
    const maxAmounts = result.unwrap();
    expect(maxAmounts["0xtoken1"]).toBe(
      (1_000_000n - 10_000n * (1n + 2n)) / 2n,
    );
  });
});
