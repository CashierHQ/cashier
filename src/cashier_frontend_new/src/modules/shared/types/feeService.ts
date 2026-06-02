import type { FeeItem } from "$modules/links/types/fee";
import type { AssetItem } from "$modules/transactionCart/types/txCart";

// Type for paired AssetItem and FeeItem
export type AssetAndFee = {
  asset: AssetItem;
  fee?: FeeItem;
};

export type ForecastAssetAndFee = {
  asset: {
    label: string;
    symbol: string;
    address: string;
    /** in formatted string */
    amount: string;
    /** in formatted string */
    usdValueStr?: string;
    icon?: string;
  };
  fee?: FeeItem;
};

export type AssetAndFeeList = AssetAndFee[];

/**
 * Input type for wallet transfer to asset mapping
 */
export type WalletAssetInput = {
  amount: bigint;
  tokenAddress: string;
};

/**
 * Type for global fee configuration
 */
export type FeeConfig = {
  amount: bigint;
  tokenAddress: string;
  symbol: string;
  decimals: number;
};
