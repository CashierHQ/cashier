export type TokenMetadata = {
  name: string;
  symbol: string;
  standard: string;
  address: string;
  decimals: number;
};

export type TokenPrice = {
  name: string;
  symbol: string;
  standard: string;
  address: string;
  priceUSD: number;
};

export type TokenPriceRecord = Record<string, number>;

export type TokenWithPriceAndBalance = TokenMetadata & {
  balance: number;
  priceUSD: number;
};
