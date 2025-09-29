import type { TokenPrice } from "$modules/token/types";
import { actorState } from "$modules/shared/state/actor.svelte";
import type { PublicTokenOverview } from "$lib/generated/icpswap/icpswapNodeIndex";

/**
 * Service for fetching data from the ICPSwap backend
 */
class TokenPriceService {
  /**
   * Fetch all token prices from the ICPSwap index canister
   * @returns Array of TokenPrice
   */
  public async getTokens(): Promise<TokenPrice[]> {
    let tokenRes: PublicTokenOverview[];
    try {
      tokenRes = await actorState.tokenIndexNodeActor.getAllTokens();
      return tokenRes.map((token) => ({
        name: token.name,
        symbol: token.symbol,
        standard: token.standard,
        address: token.address,
        priceUSD: token.priceUSD,
      }));
    } catch (e) {
      console.error(`Failed to get all tokens`, e);
      throw e;
    }
  }
}

export const tokenPriceService = new TokenPriceService();
