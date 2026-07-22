import type {
  EnrichedNFT,
  NftCollectionSummary,
  OwnedTokenRecord,
} from "$modules/wallet/types/nft";
import { buildExtThumbnailUrl } from "$modules/wallet/utils/extTokenIdentifier";

/**
 * Builds collection summaries from the NFT records currently available in the wallet.
 * @param nfts enriched NFT records from the wallet store
 * @returns alphabetically sorted collection summaries
 */
export function getNftCollectionSummaries(
  nfts: EnrichedNFT[],
): NftCollectionSummary[] {
  const collectionMap = new Map<string, NftCollectionSummary>();

  for (const nft of nfts) {
    const existingCollection = collectionMap.get(nft.collectionId);

    if (existingCollection) {
      collectionMap.set(nft.collectionId, {
        ...existingCollection,
        imageUrl:
          existingCollection.imageUrl || nft.collectionImageUrl || nft.imageUrl,
        itemCount: existingCollection.itemCount + 1,
      });
      continue;
    }

    collectionMap.set(nft.collectionId, {
      collectionId: nft.collectionId,
      name: nft.collectionName || nft.name,
      description: nft.collectionDescription || nft.description,
      imageUrl: nft.collectionImageUrl || nft.imageUrl,
      itemCount: 1,
      supply: nft.supply,
      floor: nft.floor,
      type: nft.type,
      standard: nft.standard,
      symbol: nft.collectionSymbol || nft.symbol,
    });
  }

  return Array.from(collectionMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/**
 * Filters wallet NFTs to one collection.
 * @param nfts enriched NFT records from the wallet store
 * @param collectionId collection canister id
 * @returns NFTs that belong to the requested collection
 */
export function getNftsForCollection(
  nfts: EnrichedNFT[],
  collectionId: string,
): EnrichedNFT[] {
  return nfts.filter((nft) => nft.collectionId === collectionId);
}

/**
 * Builds a sparse `EnrichedNFT` from an nftGeek-derived ownership record. nftGeek only
 * reports ownership (no name/description/attributes), so those fields are left empty —
 * existing NFT rendering already falls back to a placeholder image and `#<tokenId>`
 * display name. For EXT-standard collections, a real thumbnail image URL can still be
 * constructed directly (no candid call needed) via the collection canister's raw asset
 * gateway; other standards fall back to the placeholder image.
 * @param record the owned-token record from nftPortfolioStore
 * @param collectionId collection canister id
 * @param collectionName the collection's display name, already known by the caller
 * @param standard the collection's standard (e.g. "EXT", "ICRC-7"), if known
 * @returns a sparse EnrichedNFT suitable for the collection-details grid
 */
export function mapOwnedTokenRecordToEnrichedNft(
  record: OwnedTokenRecord,
  collectionId: string,
  collectionName: string,
  standard?: string,
): EnrichedNFT {
  const imageUrl =
    standard?.toUpperCase() === "EXT"
      ? buildExtThumbnailUrl(collectionId, Number(record.tokenId))
      : "";

  return {
    collectionId,
    tokenId: record.tokenId,
    name: "",
    description: "",
    imageUrl,
    collectionName,
    lastTransferAt: record.lastUpdatedAt,
  };
}
