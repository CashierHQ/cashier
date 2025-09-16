import { Result } from "ts-results";

export * as icpSwapPool from "./icpswap/icpswapPool";
export * as icpSwapIndexNode from "./icpswap/icpswapNodeIndex";
export * as kongBackend from "./kongswap/kongBackend";

/// Interface for token price clients
export interface TokenPriceClient {
  //// @returns An array of pairs (token_address, token_price)
  getTokenPrices(): Promise<Result<Record<string, number>, Error>>;
}
