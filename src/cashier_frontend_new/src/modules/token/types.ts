export type TokenMetadata = {
  name: string;
  symbol: string;
  standard: string;
  address: string;
  iconUrl: string | null;
};

/**
 * Type definition for a token price data
 */
export type TokenWithPrice = TokenMetadata & {
  priceUSD: number;
};

export type TokenWithPriceAndBalance = TokenWithPrice & {
  balance: bigint;
};
