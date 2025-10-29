import * as icpSwapIndexNode from "$lib/generated/icpswap/icpswapNodeIndex";
import { authState } from "$modules/auth/state/auth.svelte";
import { HOST_ICP_MAINNET } from "$modules/shared/constants";
import { ICPSWAP_INDEX_CANISTER_ID } from "$modules/token/constants";
import { Actor } from "@dfinity/agent";
import { Err, Ok, type Result } from "ts-results-es";
import { type TokenPriceService } from ".";

type IndexNodeActor = icpSwapIndexNode._SERVICE;

/**
 * Service for fetching token prices from the ICPSwap backend canister
 */
class IcpSwapTokenPriceService implements TokenPriceService {
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
  public async getTokenPrices(): Promise<
    Result<Record<string, number>, Error>
  > {
    try {
      const tokenRes: icpSwapIndexNode.PublicTokenOverview[] =
        await this.actor.getAllTokens();

      const priceMap: Record<string, number> = {};
      tokenRes.map((token) => {
        priceMap[token.address] = token.priceUSD;
      });
      return Ok(priceMap);
    } catch (e) {
      console.error(`Failed to get all tokens`, e);
      return Err(new Error(`Failed to fetch token prices from ICPSwap`));
    }
  }
}

export const icpSwapTokenPriceService = new IcpSwapTokenPriceService();
