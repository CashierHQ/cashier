/**
 * Enumeration of fee types
 */
export class FeeType {
  static readonly NETWORK_FEE = "NETWORK_FEE";
  static readonly CREATE_LINK_FEE = "CREATE_LINK_FEE";
  static readonly GATE_FEE = "GATE_FEE";
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
  amountFormattedStr: string;
  /** in formmated string */
  usdValueStr?: string;
  /** number usd value */
  usdValue?: number;
}
