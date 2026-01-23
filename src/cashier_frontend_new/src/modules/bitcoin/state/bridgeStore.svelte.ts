import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  BRIDGE_PAGE_SIZE,
  CKBTC_UPDATE_BALANCE_MAX_RETRY_TIMES,
} from "$modules/bitcoin/constants";
import { ckBTCMinterService } from "$modules/bitcoin/services/ckBTCMinterService";
import { mempoolService } from "$modules/bitcoin/services/mempoolService";
import {
  type BitcoinBlock,
  type BitcoinTransaction,
} from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionStatus,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import type { MinterInfo } from "$modules/bitcoin/types/ckbtc_minter";
import { enrichBridgeTransactionWithUsdValue } from "$modules/bitcoin/utils";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { tokenPriceStore } from "$modules/token/state/tokenPriceStore.svelte";
import { PersistedState } from "runed";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Store for user bridge transactions and bitcoin data.
 */
class BridgeStore {
  #btcAddress: PersistedState<string | null> = new PersistedState(
    "btcAddress",
    null,
  );
  #minterInfo: PersistedState<MinterInfo | null> = new PersistedState(
    "ckbtcMinterInfo",
    null,
  );
  #mempoolTxQuery;
  #bridgeTxQuery;
  #allBridges: BridgeTransactionWithUsdValue[] = [];
  #currentPage = 0;
  hasMore = $state<boolean>(true);
  processPendingTxsTask: NodeJS.Timeout | null = null;

  constructor() {
    this.#bridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        const start = this.#currentPage * BRIDGE_PAGE_SIZE;
        const bridgeTxs = await tokenStorageService.getBridgeTransactions(
          start,
          BRIDGE_PAGE_SIZE,
        );

        if (bridgeTxs.length < BRIDGE_PAGE_SIZE) {
          this.hasMore = false;
        }

        const btcPriceUSD =
          tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID);

        const enrichedBridgeTxs = enrichBridgeTransactionWithUsdValue(
          bridgeTxs,
          btcPriceUSD,
        );

        // append fetched NFTs to the existing list
        if (this.#currentPage === 0) {
          this.#allBridges = enrichedBridgeTxs;
        } else {
          const previousBridges = this.#allBridges.slice(0, start);
          this.#allBridges = [...previousBridges, ...enrichedBridgeTxs];
        }

        return this.#allBridges;
      },
      refetchInterval: 15000, // refresh every 15 seconds
      persistedKey: ["walletBridgeStore_bridgeTxs"],
      storageType: "sessionStorage",
    });

    this.#mempoolTxQuery = managedState<BitcoinTransaction[]>({
      queryFn: async () => {
        if (!this.btcAddress) {
          return [];
        }
        const mempoolTxsResult = await this.lookupMempoolTransactionByAddress(
          this.btcAddress,
        );

        if (mempoolTxsResult.isErr()) {
          return [];
        }

        const mempoolTxs = mempoolTxsResult.unwrap();
        return mempoolTxs;
      },
      refetchInterval: 15000, // refresh every 15 seconds
      persistedKey: ["walletBridgeStore_mempoolTxs"],
      storageType: "sessionStorage",
    });

    $effect.root(() => {
      $effect(() => {
        if (authState.account == null) {
          this.reset();
        } else {
          // Clean up the previous interval if any
          if (this.processPendingTxsTask) {
            clearInterval(this.processPendingTxsTask);
            this.processPendingTxsTask = null;
          }

          this.fetchBtcAddress().then((address) => {
            this.#btcAddress.current = address;
          });
          this.#bridgeTxQuery.refresh();
          this.processPendingTxsTask =
            this.createPendingBridgeTransactionsTask();
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
          this.processMempoolTransactions();
        }
      });
    });
  }

  /**
   * Load more bridges for pagination
   */
  public loadMore() {
    if (!this.hasMore) {
      return;
    }
    this.#currentPage += 1;
    this.#bridgeTxQuery.refresh();
  }

  /**
   * Reset the NFT store to initial state
   */
  public reset() {
    this.#btcAddress.current = null;
    this.#currentPage = 0;
    this.#allBridges = [];
    this.hasMore = true;
    this.#bridgeTxQuery.reset();

    // Clear interval on reset
    if (this.processPendingTxsTask) {
      clearInterval(this.processPendingTxsTask);
      this.processPendingTxsTask = null;
    }
  }

  /**
   * Fetch the BTC address associated with the user's wallet.
   * @returns The BTC address or null if not available.
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

  /**
   * Fetch and update the ckBTC minter info state.
   */
  async fetchMinterInfo() {
    try {
      const minterInfo = await ckBTCMinterService.getMinterInfo();
      this.#minterInfo.current = minterInfo;
    } catch (error) {
      console.error("Failed to fetch ckBTC minter info:", error);
      this.#minterInfo.current = null;
    }
  }

  get btcAddress() {
    return this.#btcAddress.current;
  }

  get minterInfo() {
    return this.#minterInfo.current;
  }

  get mempoolTxs() {
    return this.#mempoolTxQuery.data;
  }

  get bridgeTxs() {
    return this.#bridgeTxQuery.data;
  }

  /**
   * Process mempool transactions into bridge transactions.
   * @returns
   */
  async processMempoolTransactions() {
    if (!this.mempoolTxs) {
      return;
    }

    this.mempoolTxs.forEach(async (btcTx: BitcoinTransaction) => {
      if (this.isMempoolTxProcessed(btcTx.txid)) {
        return;
      }

      if (!this.btcAddress) {
        return;
      }

      const receiverBtcAddress = this.#btcAddress.current as string;
      const depositFee = await ckBTCMinterService.getDepositFee();
      const withdrawalFee = 0n;
      const isImporting = true;

      const createBridgeResult =
        await tokenStorageService.createBridgeTransaction(
          btcTx.sender,
          receiverBtcAddress,
          btcTx,
          depositFee,
          withdrawalFee,
          isImporting,
        );
      if (createBridgeResult.isErr()) {
        console.error(
          `Failed to create bridge transaction for BTC TXID ${btcTx.txid}:`,
          createBridgeResult.unwrapErr(),
        );
      } else {
        this.#bridgeTxQuery.refresh();
      }
    });
  }

  /**
   * Look up mempool transactions by BTC address.
   * @param address
   * @returns array of BitcoinTransaction
   */
  async lookupMempoolTransactionByAddress(
    address: string,
  ): Promise<Result<BitcoinTransaction[], string>> {
    const txIdsResult = await mempoolService.getMempoolTxs();
    if (txIdsResult.isErr()) {
      return Err(`Get mempool tx IDs failed: ${txIdsResult.unwrapErr()}`);
    }

    const txIds = txIdsResult.unwrap();
    const transactionTasks = txIds.map(async (txid) => {
      const txResult = await mempoolService.getTransactionById(txid);
      if (txResult.isErr()) {
        return null;
      }
      return txResult.unwrap();
    });

    const transactions = await Promise.all(transactionTasks);
    const filteredTransactions = transactions.filter(
      (tx): tx is BitcoinTransaction =>
        tx !== null && tx.vout.some((output) => output.address === address),
    );
    return Ok(filteredTransactions);
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

  /**
   * Create a periodic task to process pending bridge transactions.
   * This function runs in the background and updates the status of pending transactions.
   */
  createPendingBridgeTransactionsTask(): NodeJS.Timeout {
    return setInterval(async () => {
      // fetch only one pending bridge transaction to process at a time
      const pendingTxs = await tokenStorageService.getBridgeTransactions(
        0,
        1,
        BridgeTransactionStatus.Created,
      );
      if (pendingTxs.length === 0) {
        return;
      }

      const bridgeTx = pendingTxs[0];
      const btcTxId = bridgeTx.btc_txid;
      if (!btcTxId) {
        // mark as failed if no BTC txid
        let updatedStatus = BridgeTransactionStatus.Failed;
        const updateResult = await tokenStorageService.updateBridgeTransaction(
          bridgeTx.bridge_id,
          updatedStatus,
          bridgeTx.block_id ?? 0n,
          bridgeTx.block_timestamp ?? 0n,
          bridgeTx.confirmations,
        );
        if (updateResult.isOk()) {
          this.#bridgeTxQuery.refresh();
        }
        return;
      }

      const btcTxResult = await mempoolService.getTransactionById(btcTxId);
      if (btcTxResult.isErr()) {
        return;
      }

      const btcTx = btcTxResult.unwrap();
      if (btcTx.is_confirmed && btcTx.block_id && btcTx.block_timestamp) {
        const ckBTCMinterInfo = await ckBTCMinterService.getMinterInfo();
        if (!ckBTCMinterInfo) {
          return;
        }
        const currentTipHeightResult = await mempoolService.getTipHeight();
        if (currentTipHeightResult.isErr()) {
          return;
        }
        const currentTipHeight = currentTipHeightResult.unwrap();

        const maxHeight = Math.min(
          Number(currentTipHeight),
          Number(btcTx.block_id) + ckBTCMinterInfo.min_confirmations - 1,
        );
        const confirmingBlocks = await mempoolService.getLatestBlocksFromHeight(
          maxHeight,
          Number(btcTx.block_id),
        );

        let bridgeStatus = bridgeTx.status;
        let retryTimes = bridgeTx.retry_times;
        if (
          Number(currentTipHeight) - Number(btcTx.block_id) + 1 >=
          Number(ckBTCMinterInfo.min_confirmations)
        ) {
          const update = await ckBTCMinterService.updateBalance();
          if (update.isErr()) {
            console.error(
              "Failed to update ckBTC balance during bridge processing:",
              update.error,
            );
          } else {
            bridgeStatus = BridgeTransactionStatus.Completed;
          }

          retryTimes += 1;
          if (retryTimes >= CKBTC_UPDATE_BALANCE_MAX_RETRY_TIMES) {
            bridgeStatus = BridgeTransactionStatus.Completed;
          }
        }

        let bridgeBlockId = bridgeTx.block_id ?? 0n;
        let bridgeBlockTimestamp = bridgeTx.block_timestamp ?? 0n;

        if (
          bridgeStatus !== bridgeTx.status ||
          BigInt(btcTx.block_id) !== BigInt(bridgeBlockId) ||
          BigInt(btcTx.block_timestamp) !== BigInt(bridgeBlockTimestamp) ||
          confirmingBlocks.length !== bridgeTx.confirmations.length ||
          retryTimes !== bridgeTx.retry_times
        ) {
        }

        let isUpdateNeeded = false;
        let updatedStatus = null;
        if (bridgeStatus !== bridgeTx.status) {
          isUpdateNeeded = true;
          updatedStatus = bridgeStatus;
        }
        let updatedRetryTimes = null;
        if (retryTimes !== bridgeTx.retry_times) {
          isUpdateNeeded = true;
          updatedRetryTimes = retryTimes;
        }
        let updatedBlockId = null;
        if (BigInt(btcTx.block_id) !== BigInt(bridgeBlockId)) {
          isUpdateNeeded = true;
          updatedBlockId = btcTx.block_id;
        }
        let updatedBlockTimestamp = null;
        if (BigInt(btcTx.block_timestamp) !== BigInt(bridgeBlockTimestamp)) {
          isUpdateNeeded = true;
          updatedBlockTimestamp = btcTx.block_timestamp;
        }
        let updatedConfirmingBlocks: BitcoinBlock[] = [];
        if (confirmingBlocks.length !== bridgeTx.confirmations.length) {
          isUpdateNeeded = true;
          updatedConfirmingBlocks = confirmingBlocks;
        }

        if (isUpdateNeeded) {
          const updateResult =
            await tokenStorageService.updateBridgeTransaction(
              bridgeTx.bridge_id,
              updatedStatus,
              updatedBlockId,
              updatedBlockTimestamp,
              updatedConfirmingBlocks,
              null,
              null,
              null,
              updatedRetryTimes,
            );
          if (updateResult.isOk()) {
            this.#bridgeTxQuery.refresh();
          }
        }
      }
    }, 15000); // Check every 15 seconds
  }
}

export const bridgeStore = new BridgeStore();
