/**
 * Type definitions for token metadata
 */
export type TokenMetadata = {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  enabled: boolean;
};

/**
 * Type definitions for token price information
 */
export type TokenPrice = {
  name: string;
  symbol: string;
  standard: string;
  address: string;
  priceUSD: number;
};

/**
 * Type definition for a record mapping token addresses to their USD prices
 */
export type TokenPriceRecord = Record<string, number>;

/**
 * Type definition for a token with additional price and balance information
 */
export type TokenWithPriceAndBalance = TokenMetadata & {
  balance: bigint;
  priceUSD: number;
};
