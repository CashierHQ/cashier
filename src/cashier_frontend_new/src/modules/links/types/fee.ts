import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import type Intent from "$modules/links/types/action/intent";

/**
 * Enumeration of fee types
 */
export class FeeType {
  static readonly NETWORK_FEE = "NETWORK_FEE";
  static readonly CREATE_LINK_FEE = "CREATE_LINK_FEE";
}

/**
 * Fee item representation
 */
export interface FeeItem {
  feeType: FeeType;

  symbol: string;
  price?: number;
  amount: bigint;
  /** in formmated string
   * DO NOT parse this string for calculations, use `amount` field instead
   */
  amountUi: string;
  /** in formmated string */
  usdValueStr?: string;
  /** number usd value */
  usdValue?: number;
}

/**
 * Input type for computeAmountAndFee function in FeeService
 */
export type ComputeAmountAndFeeInput = {
  intent: Intent;
  ledgerFee: bigint;
  actionType: ActionTypeValue;
};
/**
 * Output type for computeAmountAndFee function in FeeService
 */
export type ComputeAmountAndFeeOutput = {
  amount: bigint;
  fee?: bigint;
};
