import type {
  OwnedTokenRecord,
  NftGeekRegistryResponse,
} from "$modules/wallet/types/nft";
import { NFTGEEK_REGISTRY_BASE_URL } from "$modules/wallet/constants";

/**
 * Service for looking up the current user's NFT portfolio from nftGeek, a 3rd-party
 * analytics platform. This is a plain REST call (not a canister call) and is never
 * synced back into our own registry — see the "User portfolio" design doc.
 */
class NftPortfolioService {
  /**
   * Get the user's owned tokens across all nftGeek-indexed collections.
   * @param principal the user's principal, as text
   * @returns a map of collection id -> owned token records. Resolves to `{}` (never
   * rejects) on any network/parsing failure — an nftGeek outage must not break the wallet.
   */
  public async getPortfolio(
    principal: string,
  ): Promise<Record<string, OwnedTokenRecord[]>> {
    try {
      const response = await fetch(
        `${NFTGEEK_REGISTRY_BASE_URL}/${principal}/registry`,
      );

      if (!response.ok) {
        console.warn(
          `nftGeek portfolio lookup failed: ${response.status} ${response.statusText}`,
        );
        return {};
      }

      const data: NftGeekRegistryResponse = await response.json();
      return this.#parseRegistry(data);
    } catch (error) {
      console.warn("Failed to fetch nftGeek portfolio:", error);
      return {};
    }
  }

  #parseRegistry(
    data: NftGeekRegistryResponse,
  ): Record<string, OwnedTokenRecord[]> {
    const portfolio: Record<string, OwnedTokenRecord[]> = {};

    for (const [collectionId, entry] of Object.entries(data.registry ?? {})) {
      portfolio[collectionId] = (entry.tokens ?? []).map((token) => ({
        tokenId: BigInt(token.tokenId),
        lastUpdatedAt: Number.isFinite(token.timeMillis)
          ? new Date(token.timeMillis).toLocaleDateString()
          : undefined,
      }));
    }

    return portfolio;
  }
}

export const nftPortfolioService = new NftPortfolioService();
