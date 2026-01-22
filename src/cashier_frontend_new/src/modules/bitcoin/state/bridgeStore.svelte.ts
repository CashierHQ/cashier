import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { ckBTCMinterService } from "$modules/bitcoin/services/ckBTCMinterService";
import { mempoolService } from "$modules/bitcoin/services/mempoolService";
import { type BitcoinTransaction } from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionStatus,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import { enrichBridgeTransactionWithUsdValue } from "$modules/bitcoin/utils";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { tokenPriceStore } from "$modules/token/state/tokenPriceStore.svelte";
import { PersistedState } from "runed";
import { onDestroy } from "svelte";

/**
 * Store for user bridge transactions and related data.
 */
class BridgeStore {
  #btcAddress: PersistedState<string | null> = new PersistedState(
    "btcAddress",
    null,
  );
  #depositFee: PersistedState<bigint | null> = new PersistedState(
    "ckbtcDepositFee",
    null,
  );
  #mempoolTxQuery;
  #bridgeTxQuery;

  constructor() {
    this.#bridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        const bridgeTxs = await tokenStorageService.getBridgeTransactions(
          0,
          10,
        );
        const btcPriceUSD =
          tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID);

        return enrichBridgeTransactionWithUsdValue(bridgeTxs, btcPriceUSD);
      },
      refetchInterval: 30000, // refresh every 30 seconds
      persistedKey: ["walletBridgeStore_bridgeTxs"],
      storageType: "sessionStorage",
    });

    this.#mempoolTxQuery = managedState<BitcoinTransaction[]>({
      queryFn: async () => {
        if (!this.btcAddress) {
          return [];
        }
        const mempoolTxs = await this.lookupMempoolTransactionByAddress(
          this.btcAddress,
        );
        // console.log(
        //   "WalletBridgeStore - Mempool TXs for address",
        //   this.btcAddress,
        //   ":",
        //   mempoolTxs,
        // );
        return mempoolTxs;
      },
      refetchInterval: 30000, // refresh every 30 seconds
      persistedKey: ["walletBridgeStore_mempoolTxs"],
      storageType: "sessionStorage",
    });

    $effect.root(() => {
      $effect(() => {
        if (authState.account == null) {
          this.#btcAddress.current = null;
          this.#bridgeTxQuery.reset();
        } else {
          this.fetchBtcAddress().then((address) => {
            this.#btcAddress.current = address;
          });
          this.#bridgeTxQuery.refresh();
          this.processPendingBridgeTransactions();
        }
      });

      $effect(() => {
        if (this.#btcAddress.current) {
          this.#mempoolTxQuery.refresh();
        } else {
          this.#mempoolTxQuery.reset();
        }
      });

      $effect(() => {
        if (this.#mempoolTxQuery.data) {
          this.#mempoolTxQuery.data.forEach(
            async (btcTx: BitcoinTransaction) => {
              if (this.isMempoolTxProcessed(btcTx.txid)) {
                return;
              }

              const depositFee = await ckBTCMinterService.getDepositFee();
              const result = await tokenStorageService.createBridgeTransaction(
                btcTx.sender,
                this.#btcAddress.current as string,
                btcTx,
                depositFee,
                0n,
                true,
              );
              if (result.isErr()) {
                console.error(
                  `Failed to create bridge transaction for BTC TXID ${btcTx.txid}:`,
                  result.unwrapErr(),
                );
              } else {
                console.log(
                  `Successfully created bridge transaction for BTC TXID ${btcTx.txid}`,
                );
                this.#bridgeTxQuery.refresh();
              }
            },
          );
        }
      });
    });
  }

  /**
   * Fetch the BTC address associated with the user's wallet.
   * @returns string | null - The BTC address or null if not available.
   */
  async fetchBtcAddress(): Promise<string | null> {
    try {
      const result = await tokenStorageService.getBtcAddress();
      if (result.isErr()) {
        throw new Error(result.unwrapErr());
      }
      return result.unwrap();
    } catch (error) {
      console.error("Failed to fetch BTC address:", error);
      return null;
    }
  }

  get btcAddress() {
    return this.#btcAddress.current;
  }

  get mempoolTxs() {
    return this.#mempoolTxQuery.data;
  }

  get bridgeTxs() {
    return this.#bridgeTxQuery.data;
  }

  get depositFee() {
    return this.#depositFee.current;
  }

  /**
   * Look up mempool transactions by BTC address.
   * @param address
   * @returns array of BitcoinTransaction
   */
  async lookupMempoolTransactionByAddress(
    address: string,
  ): Promise<BitcoinTransaction[]> {
    const txIdsResult = await mempoolService.getMempoolTxs();
    if (txIdsResult.isErr()) {
      throw new Error(txIdsResult.unwrapErr());
    }

    //console.log("Mempool TX IDs:", txIdsResult.unwrap());
    const txIds = txIdsResult.unwrap();
    const transactionTasks = txIds.map(async (txid) => {
      const txResult = await mempoolService.getTransactionById(txid);
      if (txResult.isErr()) {
        console.warn(
          `Failed to fetch transaction ${txid}:`,
          txResult.unwrapErr(),
        );
        return null;
      }
      return txResult.unwrap();
    });

    const transactions = await Promise.all(transactionTasks);
    //console.log("Fetched Mempool Transactions:", transactions);
    return transactions.filter(
      (tx): tx is BitcoinTransaction =>
        tx !== null && tx.vout.some((output) => output.address === address),
    );
  }

  /**
   * Check if a mempool transaction has already been processed into a bridge transaction.
   * @param txid
   * @returns True if processed, false otherwise.
   */
  isMempoolTxProcessed(txid: string): boolean {
    if (!this.bridgeTxs) {
      return false;
    }
    return this.bridgeTxs.some((tx) => tx.bridge_id === "import_" + txid);
  }

  async processPendingBridgeTransactions() {
    const checkInterval = setInterval(async () => {
      const pendingTxs = await tokenStorageService.getBridgeTransactions(
        0,
        1,
        BridgeTransactionStatus.Created,
      );
      if (pendingTxs.length === 0) {
        console.log("No pending bridge transactions to process.");
        return;
      }

      const bridgeTx = pendingTxs[0];
      console.log("Processing pending bridge transactions:", bridgeTx);
      const btcTxId = bridgeTx.btc_txid;
      if (!btcTxId) {
        console.warn(
          `Bridge transaction ${bridgeTx.bridge_id} has no associated BTC TXID.`,
        );
        // TODO: Handle this case appropriately.
        return;
      }

      const btcTxResult = await mempoolService.getTransactionById(btcTxId);
      if (btcTxResult.isErr()) {
        console.warn(
          `Failed to fetch BTC transaction ${btcTxId}:`,
          btcTxResult.unwrapErr(),
        );
        return;
      }
      const btcTx = btcTxResult.unwrap();
      console.log("Fetched BTC transaction for bridge processing:", btcTx);

      if (btcTx.is_confirmed && btcTx.block_id && btcTx.block_timestamp) {
        const ckBTCMinterInfo = await ckBTCMinterService.getMinterInfo();
        if (!ckBTCMinterInfo) {
          console.error("Failed to fetch ckBTC minter info.");
          return;
        }

        const currentTipHeightResult = await mempoolService.getTipHeight();
        if (currentTipHeightResult.isErr()) {
          console.error(
            "Failed to fetch current tip height:",
            currentTipHeightResult.unwrapErr(),
          );
          return;
        }
        const currentTipHeight = currentTipHeightResult.unwrap();

        const windowRange = Number(currentTipHeight) - Number(btcTx.block_id);
        const range = Math.min(windowRange, ckBTCMinterInfo.min_confirmations);

        const maxHeight = Number(btcTx.block_id) + range;
        const confirmingBlocks = await mempoolService.getLatestBlocksFromHeight(
          maxHeight,
          range,
        );

        //console.log("confirming blocks:", confirmingBlocks);

        let updated_status = BridgeTransactionStatus.Created;
        if (
          Number(currentTipHeight) - Number(btcTx.block_id) >=
          Number(ckBTCMinterInfo.min_confirmations)
        ) {
          updated_status = BridgeTransactionStatus.Completed;
        }
        //console.log("updated status:", updated_status);

        if (updated_status !== BridgeTransactionStatus.Completed) {
          const update = await ckBTCMinterService.updateBalance();
          if (update.isErr()) {
            console.error(
              "Failed to update ckBTC balance during bridge processing:",
              update.unwrapErr(),
            );
          } else {
            console.log(
              "Successfully updated ckBTC balance during bridge processing. New balance length:",
              update.unwrap(),
            );
          }
        }

        const updateResult = await tokenStorageService.updateBridgeTransaction(
          bridgeTx.bridge_id,
          updated_status,
          btcTx.block_id,
          btcTx.block_timestamp,
          confirmingBlocks,
        );
        if (updateResult.isErr()) {
          console.error(
            `Failed to update bridge transaction ${bridgeTx.bridge_id} to Completed:`,
            updateResult.unwrapErr(),
          );
        } else {
          console.log(
            `Bridge transaction ${bridgeTx.bridge_id} marked as Completed.`,
          );
          this.#bridgeTxQuery.refresh();
        }
      } else {
        console.log(
          `BTC transaction ${btcTxId} is still unconfirmed. Will check again later.`,
        );
      }
    }, 15000); // Check every 15 seconds

    // TODO
    onDestroy(() => {
      clearInterval(checkInterval);
    });
  }
}

export const bridgeStore = new BridgeStore();
