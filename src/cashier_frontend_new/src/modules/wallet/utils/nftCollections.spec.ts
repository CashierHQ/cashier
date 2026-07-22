import { describe, expect, it } from "vitest";
import type { EnrichedNFT, OwnedTokenRecord } from "$modules/wallet/types/nft";
import {
  getNftCollectionSummaries,
  getNftsForCollection,
  mapOwnedTokenRecordToEnrichedNft,
} from "$modules/wallet/utils/nftCollections";

const nfts: EnrichedNFT[] = [
  {
    collectionId: "collection-b",
    tokenId: 1n,
    name: "Beta #1",
    description: "First beta NFT",
    imageUrl: "https://example.com/beta-1.png",
    collectionName: "Beta Collection",
    collectionDescription: "Beta collection description",
    collectionImageUrl: "https://example.com/beta.png",
    collectionSymbol: "BETA",
    supply: "100",
    floor: "2 ICP",
    type: "Demo Labs",
    standard: "ICRC-7",
  },
  {
    collectionId: "collection-a",
    tokenId: 2n,
    name: "Alpha #1",
    description: "First alpha NFT",
    imageUrl: "https://example.com/alpha-1.png",
    collectionName: "Alpha Collection",
  },
  {
    collectionId: "collection-b",
    tokenId: 3n,
    name: "Beta #2",
    description: "Second beta NFT",
    imageUrl: "https://example.com/beta-2.png",
    collectionName: "Beta Collection",
  },
];

describe("getNftCollectionSummaries", () => {
  it("should group NFTs by collection and sort summaries by name", () => {
    const summaries = getNftCollectionSummaries(nfts);

    expect(summaries).toEqual([
      {
        collectionId: "collection-a",
        name: "Alpha Collection",
        description: "First alpha NFT",
        imageUrl: "https://example.com/alpha-1.png",
        itemCount: 1,
        supply: undefined,
        floor: undefined,
        type: undefined,
        standard: undefined,
        symbol: undefined,
      },
      {
        collectionId: "collection-b",
        name: "Beta Collection",
        description: "Beta collection description",
        imageUrl: "https://example.com/beta.png",
        itemCount: 2,
        supply: "100",
        floor: "2 ICP",
        type: "Demo Labs",
        standard: "ICRC-7",
        symbol: "BETA",
      },
    ]);
  });

  it("should fall back to NFT fields when collection fields are unavailable", () => {
    const [summary] = getNftCollectionSummaries([
      {
        collectionId: "collection-c",
        tokenId: 4n,
        name: "Fallback NFT",
        description: "Fallback description",
        imageUrl: "https://example.com/fallback.png",
        collectionName: "",
      },
    ]);

    expect(summary).toEqual({
      collectionId: "collection-c",
      name: "Fallback NFT",
      description: "Fallback description",
      imageUrl: "https://example.com/fallback.png",
      itemCount: 1,
      supply: undefined,
      floor: undefined,
      type: undefined,
      standard: undefined,
      symbol: undefined,
    });
  });
});

describe("getNftsForCollection", () => {
  it("should return only NFTs from the requested collection", () => {
    const collectionNfts = getNftsForCollection(nfts, "collection-b");

    expect(collectionNfts).toHaveLength(2);
    expect(
      collectionNfts.every((nft) => nft.collectionId === "collection-b"),
    ).toBe(true);
  });
});

describe("mapOwnedTokenRecordToEnrichedNft", () => {
  it("should build a sparse EnrichedNFT with empty display fields", () => {
    const record: OwnedTokenRecord = {
      tokenId: 42n,
      lastUpdatedAt: "1/1/2026",
    };

    const nft = mapOwnedTokenRecordToEnrichedNft(
      record,
      "collection-a",
      "Alpha Collection",
    );

    expect(nft).toEqual({
      collectionId: "collection-a",
      tokenId: 42n,
      name: "",
      description: "",
      imageUrl: "",
      collectionName: "Alpha Collection",
      lastTransferAt: "1/1/2026",
    });
  });

  it("should leave lastTransferAt undefined when lastUpdatedAt is missing", () => {
    const record: OwnedTokenRecord = { tokenId: 7n };

    const nft = mapOwnedTokenRecordToEnrichedNft(
      record,
      "collection-b",
      "Beta Collection",
    );

    expect(nft.lastTransferAt).toBeUndefined();
  });

  it("should build a real thumbnail image URL for EXT-standard collections", () => {
    const record: OwnedTokenRecord = { tokenId: 239n };

    const nft = mapOwnedTokenRecordToEnrichedNft(
      record,
      "kembn-6qaaa-aaaag-qc7ga-cai",
      "Some EXT Collection",
      "EXT",
    );

    expect(nft.imageUrl).toBe(
      "https://kembn-6qaaa-aaaag-qc7ga-cai.raw.icp0.io/?type=thumbnail&tokenid=4el4t-lykor-uwiaa-aaaaa-buaxz-qaqca-aaadx-q",
    );
  });

  it("should leave imageUrl empty for non-EXT standards", () => {
    const record: OwnedTokenRecord = { tokenId: 1n };

    const nft = mapOwnedTokenRecordToEnrichedNft(
      record,
      "collection-c",
      "ICRC Collection",
      "ICRC-7",
    );

    expect(nft.imageUrl).toBe("");
  });
});
