import { MOCK_NFT_COLLECTIONS } from "$modules/wallet/mock/mockNfts";
import type {
  EnrichedNFT,
  NftCollectionSummary,
} from "$modules/wallet/types/nft";

export function getNftCollectionSummaries(
  nfts: EnrichedNFT[],
): NftCollectionSummary[] {
  const collectionMap = new Map<string, NftCollectionSummary>();

  for (const nft of nfts) {
    const knownCollection = MOCK_NFT_COLLECTIONS.find(
      (collection) => collection.collectionId === nft.collectionId,
    );
    const existingCollection = collectionMap.get(nft.collectionId);

    if (existingCollection) {
      collectionMap.set(nft.collectionId, {
        ...existingCollection,
        imageUrl: existingCollection.imageUrl || nft.imageUrl,
        itemCount: existingCollection.itemCount + 1,
      });
      continue;
    }

    collectionMap.set(nft.collectionId, {
      collectionId: nft.collectionId,
      name: knownCollection?.name || nft.collectionName || nft.name,
      description: knownCollection?.description || nft.description,
      imageUrl: knownCollection?.imageUrl || nft.imageUrl,
      itemCount: 1,
      supply: knownCollection?.supply,
      floor: knownCollection?.floor,
      type: knownCollection?.type,
      standard: knownCollection?.standard,
      symbol: knownCollection?.symbol,
    });
  }

  return Array.from(collectionMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function getNftsForCollection(
  nfts: EnrichedNFT[],
  collectionId: string,
): EnrichedNFT[] {
  return nfts.filter((nft) => nft.collectionId === collectionId);
}
