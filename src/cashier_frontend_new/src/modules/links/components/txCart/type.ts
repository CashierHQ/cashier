/**
 * Enumeration of fee types
 */
export class FeeType {
  static readonly NETWORK_FEE = new FeeType("NETWORK_FEE");
  static readonly CREATE_LINK_FEE = new FeeType("CREATE_LINK_FEE");

  private constructor(public readonly type: string) {}
}

/**
 * Fee item representation
 */
export interface FeeItem {
  feeType: FeeType;

  symbol: string;
  price?: number;
  /** in formmated string */
  amount: string;
  /** in formmated string */
  usdValueStr?: string;
  /** number usd value */
  usdValue?: number;
}

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
