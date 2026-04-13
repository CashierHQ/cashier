import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  BRIDGE_PAGE_SIZE,
  MEMPOOL_API_POOLING_INTERVAL_SECONDS,
} from "$modules/bitcoin/constants";
import { mempoolService } from "$modules/bitcoin/services/mempoolService";
import { omnityBitcoinService } from "$modules/bitcoin/services/omnityBitcoinService";
import { omnityHubService } from "$modules/bitcoin/services/omnityHubService";
import { omnityRunesIndexerService } from "$modules/bitcoin/services/omnityRunesIndexerService";
import { btcBridgeStore } from "$modules/bitcoin/state/btcBridgeStore.svelte";
import {
  type BitcoinBlock,
  type BitcoinTransaction,
} from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeAssetType,
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransaction,
  type BridgeTransactionWithUsdValue,
  type BridgeUtxo,
} from "$modules/bitcoin/types/bridge_transaction";
import { type RuneBalance } from "$modules/bitcoin/types/runes";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { PersistedState } from "runed";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Runes bridges store
 */
class RuneBridgeStore {
  #runeAddress: PersistedState<string | null> = new PersistedState(
    "runeAddress",
    null,
  );
  rune_id = $state<string | null>(null);
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

  processPendingTxsTask: NodeJS.Timeout | null = null;
  mempoolTxsTask: NodeJS.Timeout | null = null;
  isRefreshing = $state<boolean>(false);

  /**
   * TODO: The real usd value will be determined by Runes price
   * @param bridgeTxs
   * @returns
   */
  #withZeroUsdValue(
    bridgeTxs: BridgeTransaction[],
  ): BridgeTransactionWithUsdValue[] {
    return bridgeTxs.map((bridge) => ({
      ...bridge,
      total_amount_usd: 0,
    }));
  }

  constructor() {
    this.#bridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        if (!authState.account?.owner) {
          return [];
        }

        const start = this.#currentPage * BRIDGE_PAGE_SIZE;
        const bridgeTxs = await tokenStorageService.getBridgeTransactions(
          start,
          BRIDGE_PAGE_SIZE,
          null,
          null,
          BridgeAssetType.Runes,
        );

        if (bridgeTxs.length < BRIDGE_PAGE_SIZE) {
          this.hasMore = false;
        }

        const enrichedBridgeTxs = this.#withZeroUsdValue(bridgeTxs);

        if (this.#currentPage === 0) {
          this.#allBridges = enrichedBridgeTxs;
        } else {
          const previousBridges = this.#allBridges.slice(0, start);
          this.#allBridges = [...previousBridges, ...enrichedBridgeTxs];
        }

        return this.#allBridges;
      },
      refetchInterval: 30_000,
      persistedKey: ["walletRuneBridgeStore_bridgeTxs"],
      storageType: "sessionStorage",
    });

    this.#importBridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        if (!authState.account?.owner) {
          return [];
        }
        if (!this.rune_id) {
          this.hasMoreImports = false;
          this.#allImportBridges = [];
          return [];
        }

        const start = this.#importCurrentPage * BRIDGE_PAGE_SIZE;
        const bridgeTxs = await tokenStorageService.getBridgeTransactions(
          start,
          BRIDGE_PAGE_SIZE,
          null,
          BridgeType.Import,
          BridgeAssetType.Runes,
          this.rune_id,
        );

        if (bridgeTxs.length < BRIDGE_PAGE_SIZE) {
          this.hasMoreImports = false;
        }

        const enrichedBridgeTxs = this.#withZeroUsdValue(bridgeTxs);

        if (this.#importCurrentPage === 0) {
          this.#allImportBridges = enrichedBridgeTxs;
        } else {
          const previousBridges = this.#allImportBridges.slice(0, start);
          this.#allImportBridges = [...previousBridges, ...enrichedBridgeTxs];
        }

        return this.#allImportBridges;
      },
      refetchInterval: 30_000,
      persistedKey: ["walletRuneBridgeStore_importBridgeTxs"],
      storageType: "sessionStorage",
    });

    this.#exportBridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        if (!authState.account?.owner) {
          return [];
        }
        if (!this.rune_id) {
          this.hasMoreExports = false;
          this.#allExportBridges = [];
          return [];
        }

        const start = this.#exportCurrentPage * BRIDGE_PAGE_SIZE;
        const bridgeTxs = await tokenStorageService.getBridgeTransactions(
          start,
          BRIDGE_PAGE_SIZE,
          null,
          BridgeType.Export,
          BridgeAssetType.Runes,
          this.rune_id,
        );

        if (bridgeTxs.length < BRIDGE_PAGE_SIZE) {
          this.hasMoreExports = false;
        }

        const enrichedBridgeTxs = this.#withZeroUsdValue(bridgeTxs);

        if (this.#exportCurrentPage === 0) {
          this.#allExportBridges = enrichedBridgeTxs;
        } else {
          const previousBridges = this.#allExportBridges.slice(0, start);
          this.#allExportBridges = [...previousBridges, ...enrichedBridgeTxs];
        }

        return this.#allExportBridges;
      },
      refetchInterval: 30_000,
      persistedKey: ["walletRuneBridgeStore_exportBridgeTxs"],
      storageType: "sessionStorage",
    });

    $effect.root(() => {
      $effect(() => {
        if (authState.account == null) {
          this.reset();
        } else {
          if (this.processPendingTxsTask) {
            clearInterval(this.processPendingTxsTask);
            this.processPendingTxsTask = null;
          }

          if (this.mempoolTxsTask) {
            clearInterval(this.mempoolTxsTask);
            this.mempoolTxsTask = null;
          }

          this.fetchRuneAddress().then((address) => {
            this.#runeAddress.current = address;
          });

          this.#bridgeTxQuery.refresh();
          this.#importBridgeTxQuery.refresh();
          this.#exportBridgeTxQuery.refresh();
          this.processPendingTxsTask =
            this.createPendingBridgeTransactionsTask();
          this.mempoolTxsTask = this.createMempoolTransactionTask();
        }
      });
    });
  }

  get runeAddress() {
    return this.#runeAddress.current;
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

  get bridgesHistory() {
    if (!this.rune_id) {
      return [];
    }

    const dedupedBridges = [
      ...(this.importBridgeTxs ?? []),
      ...(this.exportBridgeTxs ?? []),
    ].reduce<BridgeTransactionWithUsdValue[]>((acc, bridge) => {
      if (
        acc.some(
          (existingBridge) => existingBridge.bridge_id === bridge.bridge_id,
        )
      ) {
        return acc;
      }

      acc.push(bridge);
      return acc;
    }, []);

    return dedupedBridges.sort((a, b) =>
      Number(b.created_at_ts - a.created_at_ts),
    );
  }

  get hasMoreBridgesHistory() {
    if (!this.rune_id) {
      return false;
    }

    return this.hasMoreImports || this.hasMoreExports;
  }

  get isLoadingBridgesHistory() {
    if (!this.rune_id) {
      return false;
    }

    return (
      this.#importBridgeTxQuery.isLoading || this.#exportBridgeTxQuery.isLoading
    );
  }

  get bridgesHistoryError() {
    if (!this.rune_id) {
      return undefined;
    }

    return this.#importBridgeTxQuery.error ?? this.#exportBridgeTxQuery.error;
  }

  public loadMoreBridgesHistory() {
    if (!this.rune_id) {
      return;
    }

    if (this.hasMoreImports) {
      this.loadMoreImports();
    }

    if (this.hasMoreExports) {
      this.loadMoreExports();
    }
  }

  /**
   * Set the current Rune ID
   * @param runeId
   * @returns
   */
  public setRuneId(runeId: string | null) {
    if (this.rune_id === runeId) {
      return;
    }

    this.rune_id = runeId;
    this.#importCurrentPage = 0;
    this.#allImportBridges = [];
    this.hasMoreImports = true;

    this.#exportCurrentPage = 0;
    this.#allExportBridges = [];
    this.hasMoreExports = true;

    this.#importBridgeTxQuery.refresh();
    this.#exportBridgeTxQuery.refresh();
  }

  public loadMoreImports() {
    if (!this.hasMoreImports) {
      return;
    }
    this.#importCurrentPage += 1;
    this.#importBridgeTxQuery.refresh();
  }

  public loadMoreExports() {
    if (!this.hasMoreExports) {
      return;
    }
    this.#exportCurrentPage += 1;
    this.#exportBridgeTxQuery.refresh();
  }

  public reset() {
    this.#runeAddress.current = null;
    this.rune_id = null;

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
   * Fetch Rune address from token storage canister
   * @returns
   */
  async fetchRuneAddress(): Promise<string | null> {
    try {
      const result = await tokenStorageService.getRuneAddress();
      if (result.isErr()) {
        throw new Error(
          `Get Rune address error: ${JSON.stringify(result.unwrapErr())}`,
        );
      }
      return result.unwrap();
    } catch (error) {
      console.error("Failed to fetch Rune address:", error);
      return null;
    }
  }

  /**
   * Create a scheduled task to fetch and process Rune mempool transactions
   * @returns
   */
  createMempoolTransactionTask(): NodeJS.Timeout {
    return setInterval(async () => {
      await this.processRuneMempoolTransactions();
    }, MEMPOOL_API_POOLING_INTERVAL_SECONDS * 1000);
  }

  /**
   * Process Rune import bridge transaction automatically by utilizing the mempool API to lookup mempool transactions for the Rune address, then create the bridge transaction accordingly.
   * @returns
   */
  async processRuneMempoolTransactions(): Promise<void> {
    const runeAddress = this.runeAddress;
    if (!runeAddress) {
      return;
    }

    const runeTokens = this.#getRuneTokens();
    if (runeTokens.length === 0) {
      return;
    }

    const mempoolTxsResult =
      await this.lookupMempoolTransactionByAddress(runeAddress);
    if (mempoolTxsResult.isErr()) {
      return;
    }

    for (const btcTx of mempoolTxsResult.unwrap()) {
      const inputOutputs = this.#toUtxoRefsFromVin(btcTx);
      if (inputOutputs.length === 0) {
        continue;
      }

      const runeBalances =
        await this.#lookupRuneBalancesForOutputs(inputOutputs);

      const matchedVout = this.#toMatchedOutputUtxos(btcTx, runeAddress);

      for (const token of runeTokens) {
        const runeId = token.runeInfo?.runeId;
        if (
          !runeId ||
          this.#findRuneBridgeByTxidAndRuneId(btcTx.txid, runeId)
        ) {
          continue;
        }

        const matchedBalance = runeBalances.find(
          (balance) => balance.rune_id === runeId,
        );
        if (!matchedBalance) {
          continue;
        }

        const createBridgeResult =
          await tokenStorageService.createRuneImportBridgeTransaction({
            btcAddress: btcTx.sender,
            runeId,
            amount: 0n,
            decimals: token.decimals,
            btcTxid: btcTx.txid,
            vin: btcTx.vin.map((input) => ({
              txid: input.txid,
              vout: input.vout,
            })),
            vout: matchedVout,
          });

        if (createBridgeResult.isErr()) {
          console.error(
            `Failed to create Rune bridge transaction for BTC TXID ${btcTx.txid}:`,
            createBridgeResult.unwrapErr(),
          );
          continue;
        }
      }
    }

    this.#bridgeTxQuery.refresh();
    this.#importBridgeTxQuery.refresh();
    this.#exportBridgeTxQuery.refresh();
  }

  /**
   * Lookup mempool transactions associated with the Rune address
   * @param address
   * @returns
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
   * Get Runes tokens list from wallet store
   * @returns runes tokens list
   */
  #getRuneTokens(): TokenWithPriceAndBalance[] {
    return (walletStore.query.data ?? []).filter(
      (token): token is TokenWithPriceAndBalance =>
        !!token.isRune && !!token.runeInfo,
    );
  }

  /**
   * Extract input UTXOs from btc transaction
   * @param bitcoinTransaction
   * @returns UTXO references in the format of "txid:vout"
   */
  #toUtxoRefsFromVin(bitcoinTransaction: BitcoinTransaction): string[] {
    return bitcoinTransaction.vin.map((input) => `${input.txid}:${input.vout}`);
  }

  /**
   * Filter out the UTXOs sent to the Rune address from the btc transaction
   * @param bitcoinTransaction
   * @param address
   * @returns matched output UTXOs
   */
  #toMatchedOutputUtxos(
    bitcoinTransaction: BitcoinTransaction,
    address: string,
  ): BridgeUtxo[] {
    return bitcoinTransaction.vout
      .map((output, index) => ({ output, index }))
      .filter(
        ({ output }) =>
          output.address &&
          output.address.toLowerCase() === address.toLowerCase(),
      )
      .map(({ index }) => ({
        txid: bitcoinTransaction.txid,
        vout: index,
      }));
  }

  /**
   * Fetch the Rune balances for the given UTXOs by querying the Omnity Runes indexer
   * @param outputs
   * @returns
   */
  async #lookupRuneBalancesForOutputs(
    outputs: string[],
  ): Promise<RuneBalance[]> {
    const result =
      await omnityRunesIndexerService.getRuneBalancesForOutputs(outputs);
    if (result.isErr()) {
      return [];
    }

    return result
      .unwrap()
      .flatMap((entry) => (entry.length === 1 ? entry[0] : []));
  }

  /**
   * Find if there is an existing bridge transaction for the given BTC txid and Rune ID to prevent duplicate bridge creation
   * @param txid
   * @param runeId
   * @returns the matched bridge transaction if found, otherwise undefined
   */
  #findRuneBridgeByTxidAndRuneId(
    txid: string,
    runeId: string,
  ): BridgeTransactionWithUsdValue | undefined {
    return (this.bridgeTxs ?? []).find(
      (bridge) =>
        bridge.btc_txid === txid &&
        bridge.asset_infos.some(
          (asset) =>
            asset.asset_type === BridgeAssetType.Runes &&
            asset.asset_id === runeId,
        ),
    );
  }

  /**
   * Create a scheduled task to process pending Rune bridge transactions
   * @returns
   */
  createPendingBridgeTransactionsTask(): NodeJS.Timeout {
    return setInterval(async () => {
      const [pendingTxs, confirmedTxs] = await Promise.all([
        tokenStorageService.getBridgeTransactions(
          0,
          1,
          BridgeTransactionStatus.Pending,
          null,
          BridgeAssetType.Runes,
        ),
        tokenStorageService.getBridgeTransactions(
          0,
          1,
          BridgeTransactionStatus.Confirmed,
          null,
          BridgeAssetType.Runes,
        ),
      ]);

      const bridgeTx = [...pendingTxs, ...confirmedTxs][0];

      if (!bridgeTx) {
        return;
      }

      if (bridgeTx.bridge_type === BridgeType.Import) {
        await this.processRuneImportBridgeTransaction(bridgeTx);
      } else {
        await this.processRuneExportBridgeTransaction(bridgeTx);
      }
    }, MEMPOOL_API_POOLING_INTERVAL_SECONDS * 1000);
  }

  /**
   * Process pending Rune import bridge transaction automatically by utilizing the mempool API to track the btc transaction status and update the bridge transaction accordingly.
   * @param bridgeTx
   * @returns
   */
  async processRuneImportBridgeTransaction(
    bridgeTx: BridgeTransaction,
  ): Promise<void> {
    const btcTxId = bridgeTx.btc_txid;
    if (!btcTxId) {
      return;
    }

    const btcTxResult = await mempoolService.getTransactionById(btcTxId);
    if (btcTxResult.isErr()) {
      return;
    }

    const btcTx = btcTxResult.unwrap();
    const currentTipHeightResult = await mempoolService.getTipHeight();
    const currentTipHeight = currentTipHeightResult.isOk()
      ? Number(currentTipHeightResult.unwrap())
      : null;

    let updatedConfirmingBlocks: BitcoinBlock[] = [];
    if (btcTx.block_id && currentTipHeight !== null) {
      updatedConfirmingBlocks = await mempoolService.getLatestBlocksFromHeight(
        currentTipHeight,
        Number(btcTx.block_id),
      );
    }

    const updateResult = await tokenStorageService.updateBridgeTransaction(
      bridgeTx.bridge_id,
      null,
      null,
      btcTx.block_id,
      btcTx.block_timestamp,
      updatedConfirmingBlocks,
      null,
      null,
      null,
      null,
      null,
      null,
      bridgeTx.vin,
      bridgeTx.vout.length > 0
        ? bridgeTx.vout
        : this.#toMatchedOutputUtxos(btcTx, bridgeTx.btc_address),
    );

    if (updateResult.isErr()) {
      console.warn(
        `Failed to update Rune bridge confirmations for ${bridgeTx.bridge_id}:`,
        updateResult.unwrapErr(),
      );
    }

    const outputRefs = (
      bridgeTx.vout.length > 0
        ? bridgeTx.vout
        : this.#toMatchedOutputUtxos(btcTx, bridgeTx.btc_address)
    ).map((utxo) => `${utxo.txid}:${utxo.vout}`);

    if (bridgeTx.status === BridgeTransactionStatus.Pending) {
      const runeBalances = await this.#lookupRuneBalancesForOutputs(outputRefs);
      const runeAsset = bridgeTx.asset_infos.find(
        (asset) => asset.asset_type === BridgeAssetType.Runes,
      );

      const matchedBalance = runeBalances.find(
        (balance) => balance.rune_id === runeAsset?.asset_id,
      );

      if (!matchedBalance) {
        console.warn(
          `Rune balance for bridge ${bridgeTx.bridge_id} is not indexed yet; keeping bridge pending and retrying later.`,
        );
        return;
      }

      const generateTicketResult = await omnityBitcoinService.generateTicket({
        txid: btcTxId,
        target_chain_id: "eICP",
        amount: matchedBalance.amount,
        receiver: authState.account?.owner || "",
        rune_id: matchedBalance.rune_id,
      });

      if (generateTicketResult.isOk()) {
        const setTicketResult =
          await tokenStorageService.updateBridgeTransaction(
            bridgeTx.bridge_id,
            BridgeTransactionStatus.Confirmed,
            null,
            null,
            null,
            [],
            null,
            null,
            null,
            null,
            null,
            btcTxId,
            [],
            [],
            bridgeTx.asset_infos.map((assetInfo) =>
              assetInfo.asset_type === BridgeAssetType.Runes &&
              assetInfo.asset_id === matchedBalance.rune_id
                ? { ...assetInfo, amount: matchedBalance.amount }
                : assetInfo,
            ),
          );
        if (setTicketResult.isOk()) {
          this.#bridgeTxQuery.refresh();
          this.#importBridgeTxQuery.refresh();
          this.#exportBridgeTxQuery.refresh();
        }
      }
      return;
    } else if (bridgeTx.status === BridgeTransactionStatus.Confirmed) {
      if (!bridgeTx.omnity_ticket_id) {
        return;
      }

      const ticketStatusResult =
        await omnityBitcoinService.generateTicketStatus(
          bridgeTx.omnity_ticket_id,
        );
      if (ticketStatusResult.isErr()) {
        return;
      }

      const ticketStatus = ticketStatusResult.unwrap();
      if ("Finalized" in ticketStatus) {
        const completeResult =
          await tokenStorageService.updateBridgeTransaction(
            bridgeTx.bridge_id,
            BridgeTransactionStatus.Completed,
          );
        if (completeResult.isOk()) {
          this.#bridgeTxQuery.refresh();
          this.#importBridgeTxQuery.refresh();
          this.#exportBridgeTxQuery.refresh();
        }
      }
    }
  }

  /**
   * Process pending Rune export bridge transaction automatically by utilizing the mempool API to track the btc transaction status and update the bridge transaction accordingly.
   * @param bridgeTx
   * @returns
   */
  async processRuneExportBridgeTransaction(
    bridgeTx: BridgeTransaction,
  ): Promise<void> {
    if (!bridgeTx.omnity_ticket_id) {
      return;
    }

    let btcTxId = bridgeTx.btc_txid;

    if (!btcTxId) {
      const queryTxHashResult = await omnityHubService.queryTxHash(
        bridgeTx.omnity_ticket_id,
      );
      if (queryTxHashResult.isErr()) {
        console.warn(
          `Failed to query Rune export btc_txid from Omnity Hub for ${bridgeTx.bridge_id}:`,
          queryTxHashResult.unwrapErr(),
        );
        return;
      }

      btcTxId = queryTxHashResult.unwrap();
      const updateResult = await tokenStorageService.updateBridgeTransaction(
        bridgeTx.bridge_id,
        null,
        null,
        null,
        null,
        [],
        btcTxId,
      );
      if (updateResult.isOk()) {
        this.#bridgeTxQuery.refresh();
        this.#exportBridgeTxQuery.refresh();
      } else {
        console.warn(
          `Failed to update Rune export bridge ${bridgeTx.bridge_id} with Omnity btc_txid:`,
          updateResult.unwrapErr(),
        );
      }
    }

    const btcTxResult = await mempoolService.getTransactionById(btcTxId);
    if (btcTxResult.isErr()) {
      return;
    }

    const btcTx = btcTxResult.unwrap();
    const currentTipHeightResult = await mempoolService.getTipHeight();
    const currentTipHeight = currentTipHeightResult.isOk()
      ? Number(currentTipHeightResult.unwrap())
      : null;

    let updatedConfirmingBlocks: BitcoinBlock[] = [];
    if (btcTx.block_id && currentTipHeight !== null) {
      updatedConfirmingBlocks = await mempoolService.getLatestBlocksFromHeight(
        currentTipHeight,
        Number(btcTx.block_id),
      );
    }

    const shouldComplete =
      bridgeTx.status !== BridgeTransactionStatus.Completed &&
      updatedConfirmingBlocks.length >= btcBridgeStore.minConfirmations &&
      btcBridgeStore.minConfirmations > 0;

    const updateResult = await tokenStorageService.updateBridgeTransaction(
      bridgeTx.bridge_id,
      shouldComplete ? BridgeTransactionStatus.Completed : null,
      null,
      btcTx.block_id,
      btcTx.block_timestamp,
      updatedConfirmingBlocks,
      btcTxId,
    );

    if (updateResult.isOk()) {
      this.#bridgeTxQuery.refresh();
      this.#exportBridgeTxQuery.refresh();
    }
  }

  /**
   * Process import Rune bridge transaction manually by utilizing the mempool API to look up the Rune balances contained in the UTXO, then create or update the bridge transaction accordingly.
   * @param token
   * @returns
   */
  async manualRefreshBalance(
    token: Pick<TokenWithPriceAndBalance, "decimals" | "runeInfo">,
  ): Promise<Result<number, string>> {
    this.isRefreshing = true;

    try {
      const runeAddress = this.runeAddress;
      if (!runeAddress) {
        return Err("Rune address not available");
      }

      const runeId = token.runeInfo?.runeId;
      if (!runeId) {
        return Err("Rune metadata not available");
      }

      const utxoResult = await mempoolService.getAddressUtxos(runeAddress);
      if (utxoResult.isErr()) {
        return Err(utxoResult.unwrapErr());
      }

      const existingUtxos = new Set(
        (this.importBridgeTxs ?? [])
          .filter((bridge) =>
            bridge.asset_infos.some(
              (asset) =>
                bridge.bridge_type === BridgeType.Import &&
                asset.asset_type === BridgeAssetType.Runes &&
                asset.asset_id === runeId,
            ),
          )
          .flatMap((bridge) =>
            bridge.vout.map((utxo) => `${utxo.txid}:${utxo.vout}`),
          ),
      );

      const unseenUtxos = utxoResult
        .unwrap()
        .filter((utxo) => !existingUtxos.has(utxo));

      if (unseenUtxos.length === 0) {
        return Ok(0);
      }

      const runeBalancesResult =
        await omnityRunesIndexerService.getRuneBalancesForOutputs(unseenUtxos);
      if (runeBalancesResult.isErr()) {
        return Err(runeBalancesResult.unwrapErr());
      }

      const outputsByTxid: Record<string, string[]> = {};
      const matchedBalances = runeBalancesResult
        .unwrap()
        .flatMap((entry, index) => {
          const outpoint = unseenUtxos[index];
          const txid = outpoint?.split(":")[0];
          if (!outpoint || !txid) {
            return [];
          }
          outputsByTxid[txid] = [...(outputsByTxid[txid] ?? []), outpoint];

          return (entry.length === 1 ? entry[0] : [])
            .filter((item) => item.rune_id === runeId)
            .map((item) => ({ txid, balance: item }));
        });

      if (matchedBalances.length === 0) {
        return Ok(0);
      }

      const aggregatedBalances: Record<string, bigint> = {};
      for (const { txid, balance } of matchedBalances) {
        aggregatedBalances[txid] =
          (aggregatedBalances[txid] ?? 0n) + balance.amount;
      }

      let createdCount = 0;
      for (const [txid, amount] of Object.entries(aggregatedBalances)) {
        const ticketResult = await omnityBitcoinService.generateTicket({
          txid,
          target_chain_id: "eICP",
          amount,
          receiver: authState.account?.owner || "",
          rune_id: runeId,
        });
        if (ticketResult.isErr()) {
          continue;
        }

        const createResult =
          await tokenStorageService.createRuneImportBridgeTransaction({
            btcAddress: runeAddress,
            runeId,
            amount,
            decimals: token.decimals,
            btcTxid: txid,
            status: BridgeTransactionStatus.Confirmed,
            omnity_ticket_id: txid,
            vout: (outputsByTxid[txid] ?? []).map((utxo) => {
              const [utxoTxid, vout] = utxo.split(":");
              return { txid: utxoTxid, vout: Number(vout) };
            }),
          });

        if (createResult.isOk()) {
          createdCount += 1;
        }
      }

      this.#bridgeTxQuery.refresh();
      this.#importBridgeTxQuery.refresh();
      this.#exportBridgeTxQuery.refresh();

      return Ok(createdCount);
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const runeBridgeStore = new RuneBridgeStore();
