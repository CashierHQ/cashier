/**
 * Enumeration of asset processing states
 */
export class AssetProcessState {
  static readonly PENDING = "PENDING";
  static readonly PROCESSING = "PROCESSING";
  static readonly SUCCEED = "SUCCEED";
  static readonly FAILED = "FAILED";
}

/**
 * Asset item representation
 */
export interface AssetItem {
  state: AssetProcessState;
  label: string;
  symbol: string;
  address: string;
  /** in formmated string */
  amount: string;
  /** in formmated string */
  usdValueStr?: string;
}
