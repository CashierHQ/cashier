import { Actor, Agent } from "@dfinity/agent";
import { kongBackend, TokenPriceClient } from ".";
import { parseResultResponse, responseToResult } from "@/utils";
import { Token } from "./shared/token";
import { Err, Ok, Result } from "ts-results";
import { KONGSWAP_BACKEND_CANISTER_ID } from "@/const";

const ckUSDT_ADDRESS = "cngnf-vqaaa-aaaar-qag4q-cai";

type KongSwapActor = kongBackend._SERVICE;

/**
 * Service for fetching data from the KongSwap backend
 */
export class KongSwapClient implements TokenPriceClient {
  private actor: KongSwapActor;

  constructor({ agent }: { agent: Agent }) {
    this.actor = Actor.createActor(kongBackend.idlFactory, {
      agent,
      canisterId: KONGSWAP_BACKEND_CANISTER_ID,
    });
  }

  /**
   * Fetch all token prices from IC Explorer
   * @returns Object mapping token IDs to their USD prices
   */
  public async getTokenPrices(): Promise<
    Result<Record<string, number>, Error>
  > {
    let tokenRes;
    try {
      tokenRes = await this.actor.pools([ckUSDT_ADDRESS]);
    } catch (e) {
      console.error(`Failed to get all tokens`, e);
      return Err(new Error(`Failed to get all tokens`));
    }

    const result = responseToResult(tokenRes);

    if (result.err) {
      return result;
    }

    // Map to a simple object of tokenId -> price
    const priceMap: Record<string, number> = {};
    for (const token of result.val) {
      console.debug(
        `Processing pair: ${token.symbol_0}/${token.symbol_1} (${token.address_0})/(${token.address_1}) with price: ${token.price}`,
      );
      priceMap[token.address_0] = Number(token.price.toFixed(7));
    }

    return Ok(priceMap);
  }

  /**
   * Get the list of tokens supported by KongSwap
   * @returns Promise resolving to an array of Token objects
   */
  public async getListToken(): Promise<Token[]> {
    const tokensRes = await this.actor.tokens([]);
    const result = parseResultResponse(tokensRes);
    const response = result
      .map((data) => {
        if ("IC" in data) {
          return {
            symbol: data.IC.symbol,
            name: data.IC.name,
            address: data.IC.canister_id,
            fee: data.IC.fee,
            decimals: data.IC.decimals,
            token_id: data.IC.token_id,
            chain: data.IC.chain,
            canister_id: data.IC.canister_id,
          };
        }
        return null;
      })
      .filter((data) => data !== null) as Token[];
    return response;
  }
}
