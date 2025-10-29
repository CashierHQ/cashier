import { type Result } from "ts-results-es";

/// Interface for token price clients
export interface TokenPriceClient {
  //// @returns An array of pairs (token_address, token_price)
  getTokenPrices(): Promise<Result<Record<string, number>, Error>>;
}
