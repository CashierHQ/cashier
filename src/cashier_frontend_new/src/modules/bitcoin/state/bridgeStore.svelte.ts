import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { mempoolService } from "$modules/bitcoin/services/mempoolService";
import { type BitcoinTransaction } from "$modules/bitcoin/types/bitcoin_transaction";
import { type BridgeTransaction } from "$modules/bitcoin/types/bridge_transaction";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { PersistedState } from "runed";

/**
 * Store for user bridge transactions and related data.
 */
class BridgeStore {
  #btcAddress: PersistedState<string | null> = new PersistedState(
    "btcAddress",
    null,
  );
  #mempoolTxQuery;
  #bridgeTxQuery;

  constructor() {
    this.#bridgeTxQuery = managedState<BridgeTransaction[]>({
      queryFn: async () => {
        const bridgeTxs = await tokenStorageService.getBridgeTransactions(
          0,
          10,
        );
        return bridgeTxs;
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
        console.log(
          "WalletBridgeStore - Mempool TXs for address",
          this.btcAddress,
          ":",
          mempoolTxs,
        );
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
          console.log("mempoolTXs changed:", this.#mempoolTxQuery.data);
          this.#mempoolTxQuery.data.forEach(async (tx: BitcoinTransaction) => {
            const result = await tokenStorageService.createBridgeTransaction(
              tx.sender,
              tx,
              true,
            );
            if (result.isErr()) {
              console.error(
                `Failed to create bridge transaction for BTC TXID ${tx.txid}:`,
                result.unwrapErr(),
              );
            } else {
              console.log(
                `Successfully created bridge transaction for BTC TXID ${tx.txid}`,
              );
              this.#bridgeTxQuery.refresh();
            }
          });
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
}

export const bridgeStore = new BridgeStore();
