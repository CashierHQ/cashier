import { managedState } from "$lib/managedState";
import { ckBTCMinterService } from "$modules/bitcoin/services/ckBTCMinterService";
import type { BitcoinBlock } from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionStatus,
  BridgeTransactionMapper,
  BridgeType,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import { enrichBridgeTransactionWithUsdValue } from "$modules/bitcoin/utils";
import type { FeeBreakdownItem } from "$modules/links/utils/feesBreakdown";
import type { AssetAndFee } from "$modules/shared/types/feeService";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { tokenPriceStore } from "$modules/token/state/tokenPriceStore.svelte";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Store managing the bridge transaction in the transaction cart
 */
export class BridgeTxCartStore {
  #bridgeId;
  #bridgeDetailQuery;
  #ckBtcLedgerService;

  constructor(bridgeId: string) {
    this.#bridgeId = bridgeId;
    this.#ckBtcLedgerService = new IcrcLedgerService({
      name: "Chain key Bitcoin",
      symbol: "ckBTC",
      address: CKBTC_CANISTER_ID,
      decimals: 8,
      enabled: true,
      fee: 10n,
      is_default: true,
      indexId: undefined,
    });
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

  get canConfirmExport() {
    return (
      this.bridgeTransaction?.bridge_type === BridgeType.Export &&
      this.bridgeTransaction.status === BridgeTransactionStatus.Created
    );
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
      fee =
        this.bridgeTransaction.withdrawal_fee + this.bridgeTransaction.btc_fee;
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
        usdAmount:
          (Number(this.bridgeTransaction.withdrawal_fee) / 100_000_000) *
          (tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID) || 0),
      });
      feeItems.push({
        name: "Bitcoin Network Fee",
        amount: this.bridgeTransaction.btc_fee,
        tokenAddress: CKBTC_CANISTER_ID,
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        usdAmount:
          (Number(this.bridgeTransaction.btc_fee) / 100_000_000) *
          (tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID) || 0),
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

  async refresh() {
    await this.#bridgeDetailQuery.refresh();
  }

  async executeExport(): Promise<Result<BridgeTransactionWithUsdValue, string>> {
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    if (!this.canConfirmExport) {
      return Err("Bridge transaction is not ready for confirmation.");
    }

    const totalDebit =
      this.bridgeTransaction.total_amount +
      this.bridgeTransaction.withdrawal_fee +
      this.bridgeTransaction.btc_fee;

    try {
      await this.#ckBtcLedgerService.approveCkBtcWithdrawal(totalDebit);
    } catch (error) {
      return Err((error as Error).message);
    }

    const retrieveResult = await ckBTCMinterService.retrieveBtcWithApproval(
      this.bridgeTransaction.btc_address,
      this.bridgeTransaction.total_amount,
    );
    if (retrieveResult.isErr()) {
      return Err(retrieveResult.unwrapErr());
    }

    const updateResult = await tokenStorageService.updateBridgeTransaction(
      this.bridgeTransaction.bridge_id,
      BridgeTransactionStatus.Pending,
      retrieveResult.unwrap(),
    );
    if (updateResult.isErr()) {
      return Err(updateResult.unwrapErr());
    }

    await this.refresh();
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction refresh failed.");
    }

    return Ok(this.bridgeTransaction);
  }
}
