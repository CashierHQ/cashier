import { Actor, Agent } from "@dfinity/agent";
import { ICPSWAP_NODE_INDEX_CANISTER_ID } from "@/const";
import { icpSwapIndexNode, TokenPriceClient } from ".";
import { Err, Ok, Result } from "ts-results";

type IndexNodeActor = icpSwapIndexNode._SERVICE;

/**
 * Service for fetching data from the ICPSwap backend
 */
export class IcpSwapClient implements TokenPriceClient {
  private actor: IndexNodeActor;

  constructor({ agent }: { agent: Agent }) {
    this.actor = Actor.createActor(icpSwapIndexNode.idlFactory, {
      agent,
      canisterId: ICPSWAP_NODE_INDEX_CANISTER_ID,
    });
  }

  public async getTokenPrices(): Promise<
    Result<Record<string, number>, Error>
  > {
    let tokenRes;
    try {
      tokenRes = await this.actor.getAllTokens();
    } catch (e) {
      console.error(`Failed to get all tokens`, e);
      return Err(new Error(`Failed to get all tokens`));
    }

    // Map to a simple object of tokenId -> price
    const priceMap: Record<string, number> = {};
    for (const token of tokenRes) {
      console.debug(
        `Processing token: ${token.address} with price: ${token.priceUSD}`,
      );
      priceMap[token.address] = Number(token.priceUSD.toFixed(7));
    }

    return Ok(priceMap);
  }
}
