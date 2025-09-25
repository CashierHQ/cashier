import { ICPSWAP_NODE_INDEX_CANISTER_ID } from '$lib/constants';
import type { TokenData } from '$lib/types';
import { Actor, HttpAgent } from '@dfinity/agent';
import * as icpSwapIndexNode from '../../../generated/icpswap/icpswapNodeIndex';

type IndexNodeActor = icpSwapIndexNode._SERVICE;

/**
 * Service for fetching data from the ICPSwap backend
 */
export class TokenPriceService {
  private actor: IndexNodeActor;

  constructor() {
    const agent = new HttpAgent({
      host: 'https://ic0.app',
    });
    this.actor = Actor.createActor(icpSwapIndexNode.idlFactory, {
      agent,
      canisterId: ICPSWAP_NODE_INDEX_CANISTER_ID,
    });
  }

  public async getTokens(): Promise<TokenData[]> {
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
