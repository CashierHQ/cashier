import * as icpSwapIndexNode from "$lib/generated/icpswap/icpswapNodeIndex";
import { authState } from "$modules/auth/state/auth.svelte";
import { HOST_ICP_MAINNET } from "$modules/shared/constants";
import type { TokenPriceRecord } from "$modules/token/types";
import { Actor } from "@dfinity/agent";
import { ICPSWAP_INDEX_CANISTER_ID } from "../constants";

type IndexNodeActor = icpSwapIndexNode._SERVICE;

/**
 * Service for fetching token prices from the ICPSwap backend canister
 */
class TokenPriceService {
  private actor: IndexNodeActor;

  constructor() {
    const agent = authState.buildAnonymousAgent(HOST_ICP_MAINNET);
    this.actor = Actor.createActor(icpSwapIndexNode.idlFactory, {
      agent,
      canisterId: ICPSWAP_INDEX_CANISTER_ID,
    });
  }

  /**
   * Fetch all token prices from the ICPSwap index canister
   * The data is fetched using an anonymous actor
   * @returns Record of TokenPrice
   * @throws Error if fetching fails
   */
  public async getTokenPrices(): Promise<TokenPriceRecord> {
    const tokenRes: icpSwapIndexNode.PublicTokenOverview[] =
      await this.actor.getAllTokens();
    const record: TokenPriceRecord = {};
    tokenRes.map((token) => {
      record[token.address] = token.priceUSD;
    });
    return record;
  }
}

export const tokenPriceService = new TokenPriceService();
