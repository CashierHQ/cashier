import type * as icrc7Ledger from "$lib/generated/icrc7_ledger/icrc7_ledger.did";
import type * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";
import { describe, expect, it } from "vitest";
import { CollectionMetadataMapper, NFTMapper, NFTMetadataMapper } from "./nft";

describe("NFTMapper", () => {
  describe("fromTokenStorageNft", () => {
    it("should map tokenStorage.Nft to NFT", () => {
      const mockPrincipal = Principal.fromText("aaaaa-aa");
      const tokenStorageNft: tokenStorage.Nft = {
        token_id: 123n,
        collection_id: mockPrincipal,
      };

      const result = NFTMapper.fromTokenStorageNft(tokenStorageNft);

      expect(result).toEqual({
        tokenId: 123n,
        collectionId: mockPrincipal.toText(),
      });
    });

    it("should handle large token IDs", () => {
      const mockPrincipal = Principal.fromText("aaaaa-aa");
      const tokenStorageNft: tokenStorage.Nft = {
        token_id: 999999999999999999n,
        collection_id: mockPrincipal,
      };

      const result = NFTMapper.fromTokenStorageNft(tokenStorageNft);

      expect(result.tokenId).toBe(999999999999999999n);
    });

    it("should convert different Principal formats correctly", () => {
      const mockPrincipal = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");
      const tokenStorageNft: tokenStorage.Nft = {
        token_id: 1n,
        collection_id: mockPrincipal,
      };

      const result = NFTMapper.fromTokenStorageNft(tokenStorageNft);

      expect(result.collectionId).toBe("rrkah-fqaaa-aaaaa-aaaaq-cai");
    });
  });
});

describe("NFTMetadataMapper", () => {
  describe("fromIcrc7LedgerTokenMetadata", () => {
    it("should map complete metadata with all fields", () => {
      const metadata: [[string, icrc7Ledger.ICRC3Value][]] = [
        [
          ["name", { Text: "Cool NFT #1" }],
          ["description", { Text: "A very cool NFT" }],
          ["image", { Text: "https://example.com/image.png" }],
        ],
      ];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result).toEqual({
        name: "Cool NFT #1",
        description: "A very cool NFT",
        imageUrl: "https://example.com/image.png",
      });
    });

    it("should return empty strings when metadata is empty array", () => {
      const metadata: [] = [];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result).toEqual({
        name: "",
        description: "",
        imageUrl: "",
      });
    });

    it("should handle partial metadata with only name", () => {
      const metadata: [[string, icrc7Ledger.ICRC3Value][]] = [
        [["name", { Text: "NFT Name" }]],
      ];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result).toEqual({
        name: "NFT Name",
        description: "",
        imageUrl: "",
      });
    });

    it("should handle partial metadata with only description", () => {
      const metadata: [[string, icrc7Ledger.ICRC3Value][]] = [
        [["description", { Text: "NFT Description" }]],
      ];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result).toEqual({
        name: "",
        description: "NFT Description",
        imageUrl: "",
      });
    });

    it("should handle partial metadata with only image", () => {
      const metadata: [[string, icrc7Ledger.ICRC3Value][]] = [
        [["image", { Text: "https://example.com/nft.jpg" }]],
      ];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result).toEqual({
        name: "",
        description: "",
        imageUrl: "https://example.com/nft.jpg",
      });
    });

    it("should ignore non-Text value types", () => {
      const metadata: [[string, icrc7Ledger.ICRC3Value][]] = [
        [
          ["name", { Nat: 123n }], // Wrong type - should be ignored
          ["description", { Text: "Valid description" }],
        ],
      ];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result).toEqual({
        name: "",
        description: "Valid description",
        imageUrl: "",
      });
    });

    it("should ignore unknown metadata keys", () => {
      const metadata: [[string, icrc7Ledger.ICRC3Value][]] = [
        [
          ["name", { Text: "NFT Name" }],
          ["unknown_field", { Text: "Should be ignored" }],
          ["description", { Text: "NFT Description" }],
        ],
      ];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result).toEqual({
        name: "NFT Name",
        description: "NFT Description",
        imageUrl: "",
      });
    });

    it("should handle empty metadata array within outer array", () => {
      const metadata: [[string, icrc7Ledger.ICRC3Value][]] = [[]];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result).toEqual({
        name: "",
        description: "",
        imageUrl: "",
      });
    });

    it("should handle duplicate keys by using the last occurrence", () => {
      const metadata: [[string, icrc7Ledger.ICRC3Value][]] = [
        [
          ["name", { Text: "First Name" }],
          ["name", { Text: "Second Name" }],
        ],
      ];

      const result = NFTMetadataMapper.fromIcrc7LedgerTokenMetadata(metadata);

      expect(result.name).toBe("Second Name");
    });
  });
});

describe("CollectionMetadataMapper", () => {
  describe("fromIcrc7LedgerCollectionMetadata", () => {
    it("should map complete collection metadata with all fields", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["icrc7:name", { Text: "Cool Collection" }],
        ["icrc7:description", { Text: "A collection of cool NFTs" }],
        ["icrc7:symbol", { Text: "COOL" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result).toEqual({
        collectionName: "Cool Collection",
        collectionDescription: "A collection of cool NFTs",
        collectionSymbol: "COOL",
      });
    });

    it("should return empty strings when metadata is empty", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result).toEqual({
        collectionName: "",
        collectionDescription: "",
        collectionSymbol: "",
      });
    });

    it("should handle partial metadata with only name", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["icrc7:name", { Text: "Collection Name" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result).toEqual({
        collectionName: "Collection Name",
        collectionDescription: "",
        collectionSymbol: "",
      });
    });

    it("should handle partial metadata with only description", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["icrc7:description", { Text: "Collection Description" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result).toEqual({
        collectionName: "",
        collectionDescription: "Collection Description",
        collectionSymbol: "",
      });
    });

    it("should handle partial metadata with only symbol", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["icrc7:symbol", { Text: "SYM" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result).toEqual({
        collectionName: "",
        collectionDescription: "",
        collectionSymbol: "SYM",
      });
    });

    it("should ignore non-Text value types", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["icrc7:name", { Nat: 123n }], // Wrong type - should be ignored
        ["icrc7:description", { Text: "Valid description" }],
        ["icrc7:symbol", { Text: "VALID" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result).toEqual({
        collectionName: "",
        collectionDescription: "Valid description",
        collectionSymbol: "VALID",
      });
    });

    it("should ignore unknown metadata keys", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["icrc7:name", { Text: "Collection Name" }],
        ["unknown:field", { Text: "Should be ignored" }],
        ["icrc7:symbol", { Text: "COL" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result).toEqual({
        collectionName: "Collection Name",
        collectionDescription: "",
        collectionSymbol: "COL",
      });
    });

    it("should ignore non-icrc7 prefixed keys", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["name", { Text: "Wrong key format" }],
        ["icrc7:name", { Text: "Correct Collection Name" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result.collectionName).toBe("Correct Collection Name");
    });

    it("should handle duplicate keys by using the last occurrence", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["icrc7:name", { Text: "First Name" }],
        ["icrc7:name", { Text: "Second Name" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result.collectionName).toBe("Second Name");
    });

    it("should handle metadata with extra fields mixed in", () => {
      const metadata: [string, icrc7Ledger.ICRC3Value][] = [
        ["icrc7:name", { Text: "Collection" }],
        ["icrc7:total_supply", { Nat: 1000n }],
        ["icrc7:description", { Text: "Description" }],
        ["icrc7:max_supply", { Nat: 10000n }],
        ["icrc7:symbol", { Text: "SYM" }],
      ];

      const result =
        CollectionMetadataMapper.fromIcrc7LedgerCollectionMetadata(metadata);

      expect(result).toEqual({
        collectionName: "Collection",
        collectionDescription: "Description",
        collectionSymbol: "SYM",
      });
    });
  });
});
