import { walletStore } from "$modules/token/state/walletStore.svelte";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateLinkAsset, CreateLinkData } from "../types/createLinkData";
import { LinkType } from "../types/link/linkType";
import { validationService } from "./validationService";

// mock walletStore
vi.mock("$modules/token/state/walletStore.svelte", () => {
  const mockQuery = {
    data: null as TokenWithPriceAndBalance[] | null,
    reset() {
      this.data = null;
    },
  };
  return {
    walletStore: {
      get query() {
        return mockQuery;
      },
    },
    __mockQuery: mockQuery,
  };
});

const mockQuery = (walletStore as any).__mockQuery || { data: null };

describe("ValidationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletStore.query.reset();
  });

  it("should return an error if wallet tokens data is not available", () => {
    // mock walletStore to have no data
    mockQuery.data = null;

    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken1", 1000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(createLinkData);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("Wallet tokens data is not available");
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
        balance: 1_000_000n,
        priceUSD: 1.0,
      },
    ];
    mockQuery.data = mockWalletTokens;
  });
});
