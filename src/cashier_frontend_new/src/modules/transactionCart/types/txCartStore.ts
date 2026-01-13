import type { AssetAndFee } from "$modules/shared/types/feeService";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

/**
 * Common interface for transaction cart stores.
 * Ensures consistent API across LinkTxCartStore and WalletTxCartStore.
 */
export interface TxCartStore {
  /** Reactive asset and fee list for UI */
  readonly assetAndFeeList: AssetAndFee[];

  /** Initialize services (ledger, ICRC-112, etc.) */
  initialize(): void;

  /**
   * Initialize assets into reactive state.
   * @param tokens - Token lookup map for conversion
   */
  initializeAssets(tokens: Record<string, TokenWithPriceAndBalance>): void;

  /** Execute transaction - return type varies by implementation */
  execute(): Promise<unknown>;

  /** Compute total fee in USD */
  computeFee(): number;
}
