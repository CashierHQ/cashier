import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnrichedNFT } from "$modules/wallet/types/nft";

const { mockGetNfts, mockManagedState, mockQuery, mockIcrc7Service } =
  vi.hoisted(() => {
    let queryConfig: { queryFn: () => Promise<EnrichedNFT[]> } | null = null;
    const mockQuery = {
      data: undefined as EnrichedNFT[] | undefined,
      setData: vi.fn((data: EnrichedNFT[]) => {
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
      mockGetNfts: vi.fn(),
      mockQuery,
      mockManagedState: vi.fn((config) => {
        queryConfig = config;
        return mockQuery;
      }),
      mockIcrc7Service: vi.fn(() => ({
        getTokenMetadata: vi.fn().mockResolvedValue({
          name: "Token",
          description: "",
          imageUrl: "",
        }),
        getCollectionMetadata: vi.fn().mockResolvedValue({
          collectionName: "Collection",
          collectionDescription: "",
          collectionSymbol: "COL",
        }),
      })),
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

vi.mock("$modules/token/services/tokenStorage", () => ({
  tokenStorageService: {
    getNfts: mockGetNfts,
  },
}));

vi.mock("$modules/wallet/services/icrc7Service", () => ({
  Icrc7Service: mockIcrc7Service,
}));

vi.mock("$modules/wallet/services/nftDemoData", () => ({
  getDemoNfts: () => [],
}));

import { walletNftStore } from "$modules/wallet/state/walletNftStore.svelte";

const collectionId = "collection-a";
const nftOne: EnrichedNFT = {
  collectionId,
  tokenId: 1n,
  name: "One",
  description: "",
  imageUrl: "",
  collectionName: "Collection",
};
const nftTwo: EnrichedNFT = {
  collectionId,
  tokenId: 2n,
  name: "Two",
  description: "",
  imageUrl: "",
  collectionName: "Collection",
};

describe("walletNftStore optimistic removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletNftStore.reset();
    mockQuery.data = [nftOne, nftTwo];
  });

  it("should remove a sent NFT from current local data", () => {
    walletNftStore.removeNft(collectionId, 1n);

    expect(mockQuery.setData).toHaveBeenCalledWith([nftTwo]);
    expect(mockQuery.data).toEqual([nftTwo]);
  });

  it("should keep hiding a sent NFT while a stale refresh still reports it", async () => {
    walletNftStore.removeNft(collectionId, 1n);
    mockGetNfts.mockResolvedValue([
      { collectionId, tokenId: 1n },
      { collectionId, tokenId: 2n },
    ]);

    const result = await mockQuery.getConfig()?.queryFn();

    expect(result?.map((nft) => nft.tokenId)).toEqual([2n]);
  });
});
