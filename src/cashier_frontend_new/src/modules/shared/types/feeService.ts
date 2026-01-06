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

/**
 * Output type for computeSendFee method
 * Contains both raw values and formatted display strings
 * Used by ConfirmSendDrawer as dumb render component
 */
export interface SendFeeOutput {
  // Raw values (bigint for calculations)
  sendAmount: bigint;
  fee: bigint;
  totalAmount: bigint;

  // Token metadata
  symbol: string;
  decimals: number;

  // Token display info
  tokenAddress: string;
  tokenLogo: string;

  // Recipient info
  receiveAddress: string;
  receiveAddressShortened: string;

  // Network info (always ICP)
  networkName: string;
  networkLogo: string;

  // Formatted display values
  sendAmountFormatted: string;
  feeFormatted: string;
  totalAmountFormatted: string;

  // USD values (optional, depends on token.priceUSD)
  sendAmountUsd?: number;
  feeUsd?: number;
  totalAmountUsd?: number;
  sendAmountUsdFormatted?: string;
  feeUsdFormatted?: string;
  totalAmountUsdFormatted?: string;
}
