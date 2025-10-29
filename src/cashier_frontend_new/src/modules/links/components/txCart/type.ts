/**
 * Enumeration of asset processing states
 */
export class AssetProcessState {
  static readonly PENDING = new AssetProcessState("PENDING");
  static readonly PROCESSING = new AssetProcessState("PROCESSING");
  static readonly SUCCEED = new AssetProcessState("SUCCEED");
  static readonly FAILED = new AssetProcessState("FAILED");

  private constructor(public readonly type: string) {}
}

/**
 * Asset item representation
 */
export interface AssetItem {
  id: string;
  state: AssetProcessState;
  label: string;
  symbol: string;
  address: string;
  /** in formmated string */
  amount: string;
  /** in formmated string */
  usdValueStr?: string;
}
