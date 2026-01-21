import * as kongBackend from "$lib/generated/kongswap/kongBackend";
import { parseResultResponse, responseToResult } from "$lib/result";
import { authState } from "$modules/auth/state/auth.svelte";
import { HOST_ICP_MAINNET } from "$modules/shared/constants";
import { KONGSWAP_INDEX_CANISTER_ID } from "$modules/token/constants";
import { Actor } from "@dfinity/agent";
import { Err, Ok, Result } from "ts-results-es";
import { type TokenPriceService } from ".";

const ckUSDT_ADDRESS = "cngnf-vqaaa-aaaar-qag4q-cai";

type KongSwapActor = kongBackend._SERVICE;

/**
 * Service for fetching data from the KongSwap backend
 */
class KongSwapTokenPriceService implements TokenPriceService {
  private actor: KongSwapActor;

  constructor() {
    const host = HOST_ICP_MAINNET ?? "https://icp-api.io";
    const agent = authState.buildAnonymousAgent(host);
    // All canister IDs must be predefined in env
    const canisterId = KONGSWAP_INDEX_CANISTER_ID;
    if (!canisterId) {
      throw new Error(
        "KONGSWAP_INDEX_CANISTER_ID is not defined in environment variables. Please set PUBLIC_TOKEN_KONGSWAP_INDEX_CANISTER_ID in your .env file.",
      );
    }
    this.actor = Actor.createActor(kongBackend.idlFactory, {
      agent,
      canisterId,
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

    if (result.isErr()) {
      return Err(new Error(`Failed to fetch token prices from KongSwap`));
    }

    // Map to a simple object of tokenId -> price
    const priceMap: Record<string, number> = {};
    for (const token of result.unwrap()) {
      // console.debug(
      //   `Processing pair: ${token.symbol_0}/${token.symbol_1} (${token.address_0})/(${token.address_1}) with price: ${token.price}`,
      // );
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

/**
 * Represents a token with properties from multiple sources.
 *
 * @typedef {Object} Token
 * @property {string} address - The address of the token.
 * @property {string} [name] - The name of the token.
 * @property {string} [symbol] - The symbol of the token.
 * @property {string} [chain] - The chain of the token.
 */
type Token = {
  /**
   * The address of the token.
   * @type {string}
   */
  address: string;

  /**
   * The name of the token.
   */
  name: string;

  /**
   * The symbol of the token.
   */
  symbol: string;

  /**
   * The chain of the token.
   */
  chain: string;

  fee: bigint;
  decimals: number;
  token_id: number;
  canister_id: string;
};

export const kongSwapTokenPriceService = new KongSwapTokenPriceService();
