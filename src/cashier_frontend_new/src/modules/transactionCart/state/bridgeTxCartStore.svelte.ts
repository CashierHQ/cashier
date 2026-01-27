import { managedState } from "$lib/managedState";
import type { BitcoinBlock } from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionMapper,
  BridgeType,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import { enrichBridgeTransactionWithUsdValue } from "$modules/bitcoin/utils";
import type { FeeBreakdownItem } from "$modules/links/utils/feesBreakdown";
import type { AssetAndFee } from "$modules/shared/types/feeService";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { tokenPriceStore } from "$modules/token/state/tokenPriceStore.svelte";

/**
 * Store managing the bridge transaction in the transaction cart
 */
export class BridgeTxCartStore {
  #bridgeId;
  #bridgeDetailQuery;

  constructor(bridgeId: string) {
    this.#bridgeId = bridgeId;
    this.#bridgeDetailQuery =
      managedState<BridgeTransactionWithUsdValue | null>({
        queryFn: async () => {
          const bridgeTxResult =
            await tokenStorageService.getBridgeTransactionById(this.#bridgeId);
          if (bridgeTxResult.isErr()) {
            return null;
          }

          const bridgeTx = bridgeTxResult.unwrap();
          if (!bridgeTx) {
            return null;
          }

          const btcPriceUSD =
            tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID);
          const [bridgeTxWithUsdValue] = enrichBridgeTransactionWithUsdValue(
            [bridgeTx],
            btcPriceUSD,
          );
          return bridgeTxWithUsdValue;
        },
        refetchInterval: 15000, // 15 seconds
        persistedKey: [`bridgeTxCartStore_bridgeTxDetail_${this.#bridgeId}`],
        storageType: "sessionStorage",
      });
  }

  initialize() {
    this.#bridgeDetailQuery.refresh();
  }

  get bridgeTransaction() {
    return this.#bridgeDetailQuery.data;
  }

  /**
   * Get outgoing assets for the bridge transaction
   * @returns Array of AssetAndFee representing outgoing assets
   */
  get outgoingAssets(): AssetAndFee[] {
    if (!this.bridgeTransaction) {
      return [];
    }

    if (this.bridgeTransaction.bridge_type === BridgeType.Import) {
      return [];
    }

    const assetItems = BridgeTransactionMapper.toAssetItems(
      this.bridgeTransaction,
    );
    const assets: AssetAndFee[] = assetItems.map((item) => ({
      asset: item,
    }));

    return assets;
  }

  /**
   * Get incoming assets for the bridge transaction
   * @returns Array of AssetAndFee representing incoming assets
   */
  get incomingAssets(): AssetAndFee[] {
    if (!this.bridgeTransaction) {
      return [];
    }

    if (this.bridgeTransaction.bridge_type === BridgeType.Export) {
      return [];
    }

    const assetItems = BridgeTransactionMapper.toAssetItems(
      this.bridgeTransaction,
    );
    const assets: AssetAndFee[] = assetItems.map((item) => ({
      asset: item,
    }));

    return assets;
  }

  /**
   * Get total fees in USD for the bridge transaction
   * @returns Total fees in USD
   */
  get totalFeesUsd(): number {
    if (!this.bridgeTransaction) {
      return 0;
    }

    let fee = 0n;
    if (this.bridgeTransaction.bridge_type === BridgeType.Import) {
      fee = this.bridgeTransaction.deposit_fee;
    } else {
      fee = this.bridgeTransaction.withdrawal_fee;
    }

    const btcPriceUSD =
      tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID);

    if (!btcPriceUSD) {
      return 0;
    }

    const amountInBtc = Number(fee) / 100_000_000;
    return amountInBtc * btcPriceUSD;
  }

  /**
   * Get fee breakdown items for the bridge transaction
   * @returns Array of FeeBreakdownItem
   */
  get feeItems(): FeeBreakdownItem[] {
    if (!this.bridgeTransaction) {
      return [];
    }
    const feeItems: FeeBreakdownItem[] = [];
    if (this.bridgeTransaction.bridge_type === BridgeType.Import) {
      feeItems.push({
        name: "Conversion Fee",
        amount: this.bridgeTransaction.deposit_fee,
        tokenAddress: CKBTC_CANISTER_ID,
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        usdAmount: this.totalFeesUsd,
      });
    } else {
      feeItems.push({
        name: "Conversion Fee",
        amount: this.bridgeTransaction.withdrawal_fee,
        tokenAddress: CKBTC_CANISTER_ID,
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        usdAmount: this.totalFeesUsd,
      });
    }
    return feeItems;
  }

  /**
   * Get block confirmations for the bridge transaction
   * @returns Array of BitcoinBlock representing block confirmations
   */
  get blockConfirmations(): BitcoinBlock[] {
    if (!this.bridgeTransaction) {
      return [];
    }
    return this.bridgeTransaction.confirmations;
  }
}
