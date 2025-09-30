import type { TokenPrice } from "$modules/token/types";
import {
  idlFactory,
  type _SERVICE,
  type PublicTokenOverview,
} from "$lib/generated/icpswap/icpswapNodeIndex";
import { authState } from "$modules/auth/state/auth.svelte";
import { ICP_MAINNET_HOST, ICPSWAP_INDEX_CANISTER_ID } from "../constants";
import type { ActorSubclass } from "@dfinity/agent";
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
    const actor: ActorSubclass<_SERVICE> | null = authState.buildActor(
      ICPSWAP_INDEX_CANISTER_ID,
      idlFactory,
      {
        anonymous: true,
        host: ICP_MAINNET_HOST,
        shouldFetchRootKey: false
      }
    );

    if (!actor) {
      throw new Error("Failed to build actor for ICPSwap index canister");
    }

    try {
      tokenRes = await actor.getAllTokens();
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
