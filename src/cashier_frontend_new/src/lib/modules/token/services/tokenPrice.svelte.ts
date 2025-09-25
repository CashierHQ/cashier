import { HOST_ICP, ICPSWAP_INDEX_CANISTER_ID } from "$lib/constants";
import type { TokenPrice } from "$lib/modules/token/types";
import { Actor, HttpAgent } from "@dfinity/agent";
import * as icpSwapIndexNode from "../../../generated/icpswap/icpswapNodeIndex";

type IndexNodeActor = icpSwapIndexNode._SERVICE;

/**
 * Service for fetching data from the ICPSwap backend
 */
class TokenPriceService {
  private actor: IndexNodeActor;

  constructor() {
    const agent = new HttpAgent({
      host: HOST_ICP,
    });
    this.actor = Actor.createActor(icpSwapIndexNode.idlFactory, {
      agent,
      canisterId: ICPSWAP_INDEX_CANISTER_ID,
    });
  }

  /**
   * Fetch all token prices from the ICPSwap index canister
   * @returns Array of TokenPrice
   */
  public async getTokens(): Promise<TokenPrice[]> {
    let tokenRes: icpSwapIndexNode.PublicTokenOverview[];
    try {
      tokenRes = await this.actor.getAllTokens();
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
