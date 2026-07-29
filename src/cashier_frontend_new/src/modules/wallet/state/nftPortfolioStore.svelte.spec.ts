import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OwnedTokenRecord } from "$modules/wallet/types/nft";

const { mockGetPortfolio, mockManagedState, mockQuery } = vi.hoisted(() => {
  let queryConfig: {
    queryFn: () => Promise<Record<string, OwnedTokenRecord[]>>;
  } | null = null;
  const mockQuery = {
    data: undefined as Record<string, OwnedTokenRecord[]> | undefined,
    setData: vi.fn((data: Record<string, OwnedTokenRecord[]>) => {
      mockQuery.data = data;
    }),
    reset: vi.fn(() => {
      mockQuery.data = undefined;
    }),
    refresh: vi.fn(),
    refreshAsync: vi.fn(),
    getConfig: () => queryConfig,
  };

  return {
    mockGetPortfolio: vi.fn(),
    mockQuery,
    mockManagedState: vi.fn((config) => {
      queryConfig = config;
      return mockQuery;
    }),
  };
});

vi.mock("$lib/managedState", () => ({
  managedState: mockManagedState,
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "aaaaa-aa" },
  },
}));

vi.mock("$modules/wallet/services/nftPortfolioService", () => ({
  nftPortfolioService: {
    getPortfolio: mockGetPortfolio,
  },
}));

import { nftPortfolioStore } from "$modules/wallet/state/nftPortfolioStore.svelte";

const collectionId = "collection-a";

describe("nftPortfolioStore optimistic removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nftPortfolioStore.reset();
    mockQuery.data = {
      [collectionId]: [{ tokenId: 1n }, { tokenId: 2n }],
    };
  });

  it("should remove a sent token from current local portfolio data", () => {
    nftPortfolioStore.removeToken(collectionId, 1n);

    expect(mockQuery.setData).toHaveBeenCalledWith({
      [collectionId]: [{ tokenId: 2n }],
    });
    expect(nftPortfolioStore.getTokensForCollection(collectionId)).toEqual([
      { tokenId: 2n },
    ]);
  });

  it("should keep hiding a sent token while stale nftGeek data still reports it", async () => {
    nftPortfolioStore.removeToken(collectionId, 1n);
    mockGetPortfolio.mockResolvedValue({
      [collectionId]: [{ tokenId: 1n }, { tokenId: 2n }],
    });

    const result = await mockQuery.getConfig()?.queryFn();

    expect(result?.[collectionId]).toEqual([{ tokenId: 2n }]);
  });

  it("should clear the optimistic removal once nftGeek stops reporting the token", async () => {
    nftPortfolioStore.removeToken(collectionId, 1n);
    mockGetPortfolio.mockResolvedValue({
      [collectionId]: [{ tokenId: 2n }],
    });

    await mockQuery.getConfig()?.queryFn();
    mockGetPortfolio.mockResolvedValue({
      [collectionId]: [{ tokenId: 1n }, { tokenId: 2n }],
    });

    const result = await mockQuery.getConfig()?.queryFn();

    expect(result?.[collectionId]).toEqual([{ tokenId: 1n }, { tokenId: 2n }]);
  });
});
