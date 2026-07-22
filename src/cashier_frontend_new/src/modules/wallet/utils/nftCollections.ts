import type {
  EnrichedNFT,
  NftCollectionSummary,
} from "$modules/wallet/types/nft";

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
