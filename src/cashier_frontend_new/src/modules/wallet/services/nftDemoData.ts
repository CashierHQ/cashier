import {
  MOCK_DISABLED_COLLECTION_IDS,
  MOCK_NFTS,
} from "$modules/wallet/mock/mockNfts";
import type { EnrichedNFT } from "$modules/wallet/types/nft";

/**
 * Returns demo NFT data for local UI development while backend NFT data is unavailable.
 * @returns mock enriched NFTs
 */
export function getDemoNfts(): EnrichedNFT[] {
  return MOCK_NFTS;
}

/**
 * Returns collection ids hidden by default in the local demo dataset.
 * @returns disabled demo collection ids
 */
export function getDemoDisabledCollectionIds(): string[] {
  return MOCK_DISABLED_COLLECTION_IDS;
}
