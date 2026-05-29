import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  BRIDGE_PAGE_SIZE,
  CKBTC_UPDATE_BALANCE_MAX_RETRY_TIMES,
  MEMPOOL_API_POOLING_INTERVAL_SECONDS,
} from "$modules/bitcoin/constants";
import { ckBTCMinterService } from "$modules/bitcoin/services/ckBTCMinterService";
import { mempoolService } from "$modules/bitcoin/services/mempoolService";
import {
  type BitcoinBlock,
  type BitcoinTransaction,
} from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransaction,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import {
  RetrieveBtcStatusKind,
  type MinterInfo,
} from "$modules/bitcoin/types/ckbtc_minter";
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
  #minConfirmations: PersistedState<number | null> = new PersistedState(
    "ckbtcMinterMinConfirmations",
    null,
  );
  #bridgeTxQuery;
  #allBridges: BridgeTransactionWithUsdValue[] = [];
  #currentPage = 0;
  hasMore = $state<boolean>(true);

  #importBridgeTxQuery;
  #allImportBridges: BridgeTransactionWithUsdValue[] = [];
  #importCurrentPage = 0;
  hasMoreImports = $state<boolean>(true);

  #exportBridgeTxQuery;
  #allExportBridges: BridgeTransactionWithUsdValue[] = [];
  #exportCurrentPage = 0;
  hasMoreExports = $state<boolean>(true);

  mempoolTxsTask: NodeJS.Timeout | null = null;
  processPendingTxsTask: NodeJS.Timeout | null = null;
  isRefreshing = $state<boolean>(false);

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

        if (this.#currentPage === 0) {
          this.#allBridges = enrichedBridgeTxs;
        } else {
          const previousBridges = this.#allBridges.slice(0, start);
          this.#allBridges = [...previousBridges, ...enrichedBridgeTxs];
        }

        return this.#allBridges;
      },
      staleTime: 120_000,
      refetchInterval: 120_000, // 2 min — wallet ICRC-49 roundtrip; keep sparse
      persistedKey: ["walletBridgeStore_bridgeTxs"],
      storageType: "sessionStorage",
    });

    this.#importBridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        const start = this.#importCurrentPage * BRIDGE_PAGE_SIZE;
        const bridgeTxs = await tokenStorageService.getBridgeTransactions(
          start,
          BRIDGE_PAGE_SIZE,
          null,
          BridgeType.Import,
        );

        if (bridgeTxs.length < BRIDGE_PAGE_SIZE) {
          this.hasMoreImports = false;
        }

        const btcPriceUSD =
          tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID);

        const enrichedBridgeTxs = enrichBridgeTransactionWithUsdValue(
          bridgeTxs,
          btcPriceUSD,
        );

        if (this.#importCurrentPage === 0) {
          this.#allImportBridges = enrichedBridgeTxs;
        } else {
          const previousBridges = this.#allImportBridges.slice(0, start);
          this.#allImportBridges = [...previousBridges, ...enrichedBridgeTxs];
        }

        return this.#allImportBridges;
      },
      staleTime: 300_000,
      refetchInterval: 300_000, // refresh every 5 minutes
      persistedKey: ["walletBridgeStore_importBridgeTxs"],
      storageType: "sessionStorage",
    });

    this.#exportBridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        const start = this.#exportCurrentPage * BRIDGE_PAGE_SIZE;
        const bridgeTxs = await tokenStorageService.getBridgeTransactions(
          start,
          BRIDGE_PAGE_SIZE,
          null,
          BridgeType.Export,
        );

        if (bridgeTxs.length < BRIDGE_PAGE_SIZE) {
          this.hasMoreExports = false;
        }

        const btcPriceUSD =
          tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID);

        const enrichedBridgeTxs = enrichBridgeTransactionWithUsdValue(
          bridgeTxs,
          btcPriceUSD,
        );

        if (this.#exportCurrentPage === 0) {
          this.#allExportBridges = enrichedBridgeTxs;
        } else {
          const previousBridges = this.#allExportBridges.slice(0, start);
          this.#allExportBridges = [...previousBridges, ...enrichedBridgeTxs];
        }

        return this.#allExportBridges;
      },
      staleTime: 300_000,
      refetchInterval: 300_000, // refresh every 5 minutes
      persistedKey: ["walletBridgeStore_exportBridgeTxs"],
      storageType: "sessionStorage",
    });

    $effect.root(() => {
      $effect(() => {
        if (authState.account == null) {
          this.reset();
        } else {
          // Clean up the previous interval if any
          if (this.mempoolTxsTask) {
            clearInterval(this.mempoolTxsTask);
            this.mempoolTxsTask = null;
          }

          if (this.processPendingTxsTask) {
            clearInterval(this.processPendingTxsTask);
            this.processPendingTxsTask = null;
          }

          this.fetchBtcAddress().then((address) => {
            this.#btcAddress.current = address;
          });

          this.fetchMinterInfo().then((minterInfo) => {
            this.#minConfirmations.current =
              minterInfo?.min_confirmations ?? null;
          });

          this.#bridgeTxQuery.refresh();
          this.#importBridgeTxQuery.refresh();
          this.#exportBridgeTxQuery.refresh();
          this.mempoolTxsTask = this.createMempoolTransactionTask();
          this.processPendingTxsTask =
            this.createPendingBridgeTransactionsTask();
        }
      });
    });
  }

  get btcAddress() {
    return this.#btcAddress.current;
  }

  get minConfirmations() {
    return this.#minConfirmations.current ?? 0;
  }

  get bridgeTxs() {
    return this.#bridgeTxQuery.data;
  }

  get importBridgeTxs() {
    return this.#importBridgeTxQuery.data;
  }

  get exportBridgeTxs() {
    return this.#exportBridgeTxQuery.data;
  }

  /**
   * Load more bridges for pagination (unified history)
   */
  public loadMore() {
    if (!this.hasMore) {
      return;
    }
    this.#currentPage += 1;
    this.#bridgeTxQuery.refresh();
  }

  /**
   * Load more import bridges for pagination (Receive page)
   */
  public loadMoreImports() {
    if (!this.hasMoreImports) {
      return;
    }
    this.#importCurrentPage += 1;
    this.#importBridgeTxQuery.refresh();
  }

  /**
   * Load more export bridges for pagination (Send page)
   */
  public loadMoreExports() {
    if (!this.hasMoreExports) {
      return;
    }
    this.#exportCurrentPage += 1;
    this.#exportBridgeTxQuery.refresh();
  }

  /**
   * Refetch export and unified bridge lists (Send page history refresh).
   */
  public refreshExportHistoryAsync(): Promise<void> {
    return Promise.all([
      this.#exportBridgeTxQuery.refreshAsync(),
      this.#bridgeTxQuery.refreshAsync(),
    ]).then(() => undefined);
  }

  /**
   * Reset the bridge store to initial state
   */
  public reset() {
    this.#btcAddress.current = null;

    this.#currentPage = 0;
    this.#allBridges = [];
    this.hasMore = true;
    this.#bridgeTxQuery.reset();

    this.#importCurrentPage = 0;
    this.#allImportBridges = [];
    this.hasMoreImports = true;
    this.#importBridgeTxQuery.reset();

    this.#exportCurrentPage = 0;
    this.#allExportBridges = [];
    this.hasMoreExports = true;
    this.#exportBridgeTxQuery.reset();

    // Clear interval on reset
    if (this.mempoolTxsTask) {
      clearInterval(this.mempoolTxsTask);
      this.mempoolTxsTask = null;
    }

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
        throw new Error(
          `Get BTC address error: ${JSON.stringify(result.unwrapErr())}`,
        );
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
  async fetchMinterInfo(): Promise<MinterInfo | null> {
    try {
      const minterInfo = await ckBTCMinterService.getMinterInfo();
      return minterInfo;
    } catch (error) {
      console.error("Failed to fetch ckBTC minter info:", error);
      return null;
    }
  }

  /**
   * Create a scheduled task to fetch and process mempool transactions
   * @returns
   */
  createMempoolTransactionTask(): NodeJS.Timeout {
    return setInterval(async () => {
      if (!this.btcAddress) {
        return;
      }
      const result = await this.lookupMempoolTransactionByAddress(
        this.btcAddress,
      );
      if (result.isErr()) {
        return;
      }
      await this.processMempoolTransactions(result.unwrap());
    }, MEMPOOL_API_POOLING_INTERVAL_SECONDS * 1000);
  }

  /**
   * Fetch mempool transactions associated with the btc address using mempool API
   * @param address
   * @returns btc transactions or error message if failed to fetch
   */
  async lookupMempoolTransactionByAddress(
    address: string,
  ): Promise<Result<BitcoinTransaction[], string>> {
    const addressTxsResult =
      await mempoolService.getAddressTransactions(address);
    if (addressTxsResult.isErr()) {
      return Err(
        `Get address transactions failed: ${addressTxsResult.unwrapErr()}`,
      );
    }

    return Ok(
      addressTxsResult
        .unwrap()
        .filter(
          (tx) =>
            !tx.is_confirmed &&
            tx.vout.some((output) => output.address === address),
        ),
    );
  }

  /**
   * Process mempool transactions fetched from mempool API
   * @param txs
   */
  async processMempoolTransactions(txs: BitcoinTransaction[]) {
    if (!this.btcAddress) {
      return;
    }

    for (const btcTx of txs) {
      if (this.isMempoolTxProcessed(btcTx.txid)) {
        continue;
      }

      const depositFee = await ckBTCMinterService.getDepositFee();
      const createBridgeResult =
        await tokenStorageService.createImportBridgeTransaction(
          btcTx.sender,
          this.btcAddress,
          btcTx,
          depositFee,
          0n,
          true,
        );

      if (createBridgeResult.isErr()) {
        console.error(
          `Failed to create bridge transaction for BTC TXID ${btcTx.txid}:`,
          createBridgeResult.unwrapErr(),
        );
      } else {
        this.#bridgeTxQuery.refresh();
        this.#importBridgeTxQuery.refresh();
      }
    }
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
      const pendingTxs = await tokenStorageService.getBridgeTransactions(
        0,
        1,
        BridgeTransactionStatus.Pending,
      );

      if (pendingTxs.length === 0) {
        return;
      }

      await this.processBridgeTransaction(pendingTxs[0]);
    }, MEMPOOL_API_POOLING_INTERVAL_SECONDS * 1000);
  }

  /**
   * Process a bridge transaction based on its type.
   * @param bridgeTx The bridge transaction to process.
   */
  async processBridgeTransaction(bridgeTx: BridgeTransaction): Promise<void> {
    if (bridgeTx.bridge_type === BridgeType.Export) {
      await this.processExportBridgeTransaction(bridgeTx);
    } else {
      await this.processImportBridgeTransaction(bridgeTx);
    }
  }

  /**
   * Process import bridge
   * @param bridgeTx The bridge transaction to process
   */
  async processImportBridgeTransaction(
    bridgeTx: BridgeTransaction,
  ): Promise<void> {
    const btcTxId = bridgeTx.btc_txid;
    if (!btcTxId) {
      // mark as failed if no BTC txid
      const updatedStatus = BridgeTransactionStatus.Failed;
      const updateResult = await tokenStorageService.updateBridgeTransaction(
        bridgeTx.bridge_id,
        updatedStatus,
        null,
        bridgeTx.block_id ?? 0n,
        bridgeTx.block_timestamp ?? 0n,
        bridgeTx.confirmations,
      );
      if (updateResult.isOk()) {
        this.#bridgeTxQuery.refresh();
        this.#importBridgeTxQuery.refresh();
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
        const update = await ckBTCMinterService.updateBalanceWithMintedInfo();
        if (update.isErr()) {
          console.error(
            "Failed to update ckBTC balance during bridge processing:",
            update.unwrapErr(),
          );
        } else {
          bridgeStatus = BridgeTransactionStatus.Completed;
        }

        retryTimes += 1;
        if (retryTimes >= CKBTC_UPDATE_BALANCE_MAX_RETRY_TIMES) {
          bridgeStatus = BridgeTransactionStatus.Completed;
        }
      }

      const bridgeBlockId = bridgeTx.block_id ?? 0n;
      const bridgeBlockTimestamp = bridgeTx.block_timestamp ?? 0n;

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
        const updateResult = await tokenStorageService.updateBridgeTransaction(
          bridgeTx.bridge_id,
          updatedStatus,
          null,
          updatedBlockId,
          updatedBlockTimestamp,
          updatedConfirmingBlocks,
          null,
          null,
          null,
          null,
          updatedRetryTimes,
        );

        if (updateResult.isErr()) {
          console.error(
            `Failed to update bridge transaction ${bridgeTx.bridge_id}:`,
            updateResult.unwrapErr(),
          );
        } else {
          this.#bridgeTxQuery.refresh();
          this.#importBridgeTxQuery.refresh();
        }
      }
    }
  }

  /**
   * Process export bridge transaction
   * @param bridgeTx The bridge transaction to process
   * @returns
   */
  async processExportBridgeTransaction(
    bridgeTx: BridgeTransaction,
  ): Promise<void> {
    if (bridgeTx.ckbtc_block_id && !bridgeTx.btc_txid) {
      const statusResult = await ckBTCMinterService.retrieveBtcStatusV2(
        bridgeTx.ckbtc_block_id,
      );
      if (statusResult.isErr()) {
        console.error(
          `Failed to retrieve BTC status for bridge ${bridgeTx.bridge_id}:`,
          statusResult.unwrapErr(),
        );
        return;
      }

      const status = statusResult.unwrap();
      if (
        (status.kind === RetrieveBtcStatusKind.Submitted ||
          status.kind === RetrieveBtcStatusKind.Sending ||
          status.kind === RetrieveBtcStatusKind.Confirmed) &&
        status.txid
      ) {
        const updateResult = await tokenStorageService.updateBridgeTransaction(
          bridgeTx.bridge_id,
          null,
          null,
          null,
          null,
          [],
          status.txid,
        );
        if (updateResult.isErr()) {
          console.error(
            `Failed to update export bridge transaction ${bridgeTx.bridge_id}:`,
            updateResult.unwrapErr(),
          );
        } else {
          this.#bridgeTxQuery.refresh();
          this.#exportBridgeTxQuery.refresh();
        }
      } else if (
        status.kind === RetrieveBtcStatusKind.AmountTooLow ||
        status.kind === RetrieveBtcStatusKind.Unknown ||
        status.kind === RetrieveBtcStatusKind.WillReimburse ||
        status.kind === RetrieveBtcStatusKind.Reimbursed
      ) {
        const updateResult = await tokenStorageService.updateBridgeTransaction(
          bridgeTx.bridge_id,
          BridgeTransactionStatus.Failed,
        );
        if (updateResult.isOk()) {
          this.#bridgeTxQuery.refresh();
          this.#exportBridgeTxQuery.refresh();
        }
      }
      return;
    }

    if (!bridgeTx.btc_txid) {
      return;
    }

    const btcTxResult = await mempoolService.getTransactionById(
      bridgeTx.btc_txid,
    );

    if (btcTxResult.isErr()) {
      return;
    }

    const btcTx = btcTxResult.unwrap();
    const updatedBlockId =
      btcTx.block_id && bridgeTx.block_id !== btcTx.block_id
        ? btcTx.block_id
        : null;

    const updatedBlockTimestamp =
      btcTx.block_timestamp &&
      bridgeTx.block_timestamp !== btcTx.block_timestamp
        ? btcTx.block_timestamp
        : null;

    const currentTipHeightResult = await mempoolService.getTipHeight();
    if (currentTipHeightResult.isErr()) {
      return;
    }
    const currentTipHeight = currentTipHeightResult.unwrap();

    let updatedConfirmingBlocks: BitcoinBlock[] = [];
    if (btcTx.block_id) {
      updatedConfirmingBlocks = await mempoolService.getLatestBlocksFromHeight(
        Number(currentTipHeight),
        Number(btcTx.block_id),
      );
    }

    const shouldUpdateConfirmations =
      updatedConfirmingBlocks.length > 0 &&
      updatedConfirmingBlocks.length !== bridgeTx.confirmations.length;
    const shouldComplete =
      bridgeTx.status !== BridgeTransactionStatus.Completed &&
      updatedConfirmingBlocks.length >= this.minConfirmations;

    if (
      !updatedBlockId &&
      !updatedBlockTimestamp &&
      !shouldUpdateConfirmations &&
      !shouldComplete
    ) {
      return;
    }

    const updateResult = await tokenStorageService.updateBridgeTransaction(
      bridgeTx.bridge_id,
      shouldComplete ? BridgeTransactionStatus.Completed : null,
      null,
      updatedBlockId,
      updatedBlockTimestamp,
      shouldUpdateConfirmations ? updatedConfirmingBlocks : [],
    );

    if (updateResult.isOk()) {
      this.#bridgeTxQuery.refresh();
      this.#exportBridgeTxQuery.refresh();
    }
  }
  /**
   * Manually trigger a ckBTC balance refresh.
   * Calls update_balance on the ckBTC minter and creates a Completed import
   * bridge transaction for each newly minted UTXO found.
   * @returns Ok(count) where count is the number of minted UTXOs processed,
   *          Ok(0) when no incoming balance was found, or Err on failure.
   */
  async manualRefreshBalance(): Promise<Result<number, string>> {
    this.isRefreshing = true;
    try {
      const mintedResult =
        await ckBTCMinterService.updateBalanceWithMintedInfo();
      if (mintedResult.isErr()) {
        return Err(mintedResult.unwrapErr());
      }

      const mintedInfos = mintedResult.unwrap();
      if (mintedInfos.length === 0) {
        return Ok(0);
      }

      const btcAddress = this.btcAddress;
      if (!btcAddress) {
        return Err("BTC address not available");
      }

      const depositFee = await ckBTCMinterService.getDepositFee();
      const ckBTCMinterInfo = await ckBTCMinterService.getMinterInfo();
      const tipHeightResult = await mempoolService.getTipHeight();
      const currentTipHeight = tipHeightResult.isOk()
        ? Number(tipHeightResult.unwrap())
        : null;

      for (const mintedInfo of mintedInfos) {
        // Fetch confirming blocks (needed for both create and update paths)
        let confirmingBlocks: BitcoinBlock[] = [];
        if (currentTipHeight !== null && ckBTCMinterInfo) {
          const maxHeight = Math.min(
            currentTipHeight,
            mintedInfo.btcHeight + ckBTCMinterInfo.min_confirmations - 1,
          );
          confirmingBlocks = await mempoolService.getLatestBlocksFromHeight(
            maxHeight,
            mintedInfo.btcHeight,
          );
        }

        // Check if a bridge for this BTC txid already exists (created by the
        // automatic mempool polling flow while the user was away)
        const existingBridge = (this.bridgeTxs ?? []).find(
          (tx) => tx.btc_txid === mintedInfo.btcTxid,
        );

        if (existingBridge) {
          if (existingBridge.status === BridgeTransactionStatus.Completed) {
            continue;
          }
          // Update existing Pending bridge to Completed with confirmation blocks
          const updateResult =
            await tokenStorageService.updateBridgeTransaction(
              existingBridge.bridge_id,
              BridgeTransactionStatus.Completed,
              null,
              BigInt(mintedInfo.btcHeight),
              confirmingBlocks.length > 0
                ? confirmingBlocks[0].block_timestamp
                : (existingBridge.block_timestamp ?? 0n),
              confirmingBlocks,
            );
          if (updateResult.isErr()) {
            console.error(
              "Failed to update existing bridge to Completed:",
              updateResult.unwrapErr(),
            );
          }
          continue;
        }

        // No existing bridge — create a new one
        const createResult =
          await tokenStorageService.createManualImportBridgeTransaction(
            btcAddress,
            mintedInfo.mintedAmount,
            mintedInfo.blockIndex,
            depositFee,
            mintedInfo.btcTxid,
          );
        if (createResult.isErr()) {
          console.error(
            "Failed to create manual import bridge:",
            createResult.unwrapErr(),
          );
          continue;
        }

        if (confirmingBlocks.length > 0) {
          const updateResult =
            await tokenStorageService.updateBridgeTransaction(
              createResult.unwrap().bridge_id,
              null,
              null,
              BigInt(mintedInfo.btcHeight),
              confirmingBlocks[0].block_timestamp,
              confirmingBlocks,
            );
          if (updateResult.isErr()) {
            console.error(
              "Failed to set confirmations on manual import bridge:",
              updateResult.unwrapErr(),
            );
          }
        }
      }

      this.#bridgeTxQuery.refresh();
      this.#importBridgeTxQuery.refresh();

      return Ok(mintedInfos.length);
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const bridgeStore = new BridgeStore();
