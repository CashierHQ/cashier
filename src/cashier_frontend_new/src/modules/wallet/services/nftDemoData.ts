import { MOCK_NFTS } from "$modules/wallet/mock/mockNfts";
import type { EnrichedNFT } from "$modules/wallet/types/nft";

/**
 * Returns demo NFT data for local UI development while backend NFT data is unavailable.
 * @returns mock enriched NFTs
 */
export function getDemoNfts(): EnrichedNFT[] {
  return MOCK_NFTS;
}
