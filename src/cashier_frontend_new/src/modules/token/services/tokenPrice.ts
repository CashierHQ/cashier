import * as icpSwapIndexNode from "$lib/generated/icpswap/icpswapNodeIndex";
import { HOST_ICP_MAINNET } from "$modules/shared/constants";
import type { TokenWithPrice } from "$modules/token/types";
import { Actor, HttpAgent } from "@dfinity/agent";
import { ICPSWAP_INDEX_CANISTER_ID } from "../constants";

type IndexNodeActor = icpSwapIndexNode._SERVICE;

/**
 * Service for fetching data from the ICPSwap backend
 */
class TokenPriceService {
  private actor: IndexNodeActor;

  constructor() {
    const agent = HttpAgent.createSync({
      host: HOST_ICP_MAINNET,
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
  public async getTokenPrices(): Promise<TokenWithPrice[]> {
    let tokenRes: icpSwapIndexNode.PublicTokenOverview[];
    try {
      tokenRes = await this.actor.getAllTokens();
      return tokenRes.map((token) => ({
        name: token.name,
        symbol: token.symbol,
        standard: token.standard,
        address: token.address,
        iconUrl: null,
        priceUSD: token.priceUSD,
      }));
    } catch (e) {
      console.error(`Failed to get all tokens`, e);
      throw e;
    }
  }
}

export const tokenPriceService = new TokenPriceService();
