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
    /** in formmated string */
    amount: string;
    /** in formmated string */
    usdValueStr?: string;
  };
  fee?: FeeItem;
};

export type AssetAndFeeList = AssetAndFee[];