import { Result } from "ts-results";

/// Interface for token price clients
export interface TokenPriceClient {
  //// @returns An array of pairs (token_address, token_price)
  getTokenPrices(): Promise<Result<Record<string, number>, Error>>;
}
