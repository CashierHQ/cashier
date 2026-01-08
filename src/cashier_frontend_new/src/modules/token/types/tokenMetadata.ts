/**
 * Type definitions for token metadata
 */
export type TokenMetadata = {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  enabled: boolean;
  fee: bigint;
  is_default: boolean;
  indexId?: string;
};

/**
 * Type definition for a token with additional price and balance information
 */
export type TokenWithPriceAndBalance = TokenMetadata & {
  balance: bigint;
  priceUSD?: number;
};
