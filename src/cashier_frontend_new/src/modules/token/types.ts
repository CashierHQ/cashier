export type TokenMetadata = {
  name: string;
  symbol: string;
  standard: string;
  address: string;
  decimals: number;
  iconUrl: string | null;
};

export type TokenWithPrice = TokenMetadata & {
  priceUSD: number;
};

export type TokenWithPriceAndBalance = TokenWithPrice & {
  balance: number;
};
