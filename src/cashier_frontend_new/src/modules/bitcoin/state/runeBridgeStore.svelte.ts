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
import { enrichBridgeTransactionWithUsdValue } from "$modules/bitcoin/utils";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { tokenPriceStore } from "$modules/token/state/tokenPriceStore.svelte";
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
  isRefreshing = $state<boolean>(false);

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
      refetchInterval: 30_000,
      persistedKey: ["walletRuneBridgeStore_bridgeTxs"],
      storageType: "sessionStorage",
    });

    this.#importBridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        if (!authState.account?.owner) {
          return [];
        }

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
      refetchInterval: 30_000,
      persistedKey: ["walletRuneBridgeStore_importBridgeTxs"],
      storageType: "sessionStorage",
    });

    this.#exportBridgeTxQuery = managedState<BridgeTransactionWithUsdValue[]>({
      queryFn: async () => {
        if (!authState.account?.owner) {
          return [];
        }

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

          this.fetchRuneAddress().then((address) => {
            this.#runeAddress.current = address;
          });

          this.#bridgeTxQuery.refresh();
          this.#importBridgeTxQuery.refresh();
          this.#exportBridgeTxQuery.refresh();
          this.processPendingTxsTask =
            this.createPendingBridgeTransactionsTask();
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

    if (this.processPendingTxsTask) {
      clearInterval(this.processPendingTxsTask);
      this.processPendingTxsTask = null;
    }
  }

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

  getImportBridgeTransactionsForToken(
    token?: Pick<
      TokenWithPriceAndBalance,
      "address" | "isRune" | "runeInfo"
    > | null,
  ): BridgeTransactionWithUsdValue[] {
    const bridgeTxs = this.importBridgeTxs ?? [];
    if (!token?.isRune || !token.runeInfo) {
      return [];
    }

    return bridgeTxs.filter((bridge) =>
      bridge.asset_infos.some(
        (asset) =>
          bridge.bridge_type === BridgeType.Import &&
          asset.asset_type === BridgeAssetType.Runes &&
          asset.asset_id === token.runeInfo?.runeId,
      ),
    );
  }

  getExportBridgeTransactionsForToken(
    token?: Pick<
      TokenWithPriceAndBalance,
      "address" | "isRune" | "runeInfo"
    > | null,
  ): BridgeTransactionWithUsdValue[] {
    const bridgeTxs = this.exportBridgeTxs ?? [];
    if (!token?.isRune || !token.runeInfo) {
      return [];
    }

    return bridgeTxs.filter((bridge) =>
      bridge.asset_infos.some(
        (asset) =>
          bridge.bridge_type === BridgeType.Export &&
          asset.asset_type === BridgeAssetType.Runes &&
          asset.asset_id === token.runeInfo?.runeId,
      ),
    );
  }

  hasMoreExportBridgeTransactionsForToken(
    token?: Pick<
      TokenWithPriceAndBalance,
      "address" | "isRune" | "runeInfo"
    > | null,
  ): boolean {
    return (
      this.hasMoreExports &&
      this.getExportBridgeTransactionsForToken(token).length >= BRIDGE_PAGE_SIZE
    );
  }

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

    console.log(`Address txs result`, addressTxsResult.unwrap());

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

  #getRuneTokens(): TokenWithPriceAndBalance[] {
    return (walletStore.query.data ?? []).filter(
      (token): token is TokenWithPriceAndBalance =>
        !!token.isRune && !!token.runeInfo,
    );
  }

  #toUtxoRefsFromVin(bitcoinTransaction: BitcoinTransaction): string[] {
    return bitcoinTransaction.vin.map((input) => `${input.txid}:${input.vout}`);
  }

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

  async #lookupRuneBalancesForOutputs(outputs: string[]) {
    const result =
      await omnityRunesIndexerService.getRuneBalancesForOutputs(outputs);
    if (result.isErr()) {
      return [];
    }

    return result
      .unwrap()
      .flatMap((entry) => (entry.length === 1 ? entry[0] : []));
  }

  #findRuneBridgeByTxidAndRuneId(txid: string, runeId: string) {
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

  async processRuneMempoolTransactions(): Promise<void> {
    console.log("Processing Rune mempool transactions...");
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

    console.log(
      `Mempool transactions for address ${runeAddress}:`,
      mempoolTxsResult.unwrap(),
    );

    for (const btcTx of mempoolTxsResult.unwrap()) {
      const inputOutputs = this.#toUtxoRefsFromVin(btcTx);
      if (inputOutputs.length === 0) {
        continue;
      }

      console.log(`input utxos`, inputOutputs);

      const runeBalances =
        await this.#lookupRuneBalancesForOutputs(inputOutputs);
      console.log(`Rune balances for inputs`, runeBalances);

      const matchedVout = this.#toMatchedOutputUtxos(btcTx, runeAddress);
      console.log(`Matched output utxos`, matchedVout);

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
            btcAddress: runeAddress,
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

  createPendingBridgeTransactionsTask(): NodeJS.Timeout {
    return setInterval(async () => {
      console.log("Checking pending Rune bridge transactions in mempool...");
      await this.processRuneMempoolTransactions();

      const [pendingTxs, confirmedTxs] = await Promise.all([
        tokenStorageService.getBridgeTransactions(
          0,
          10,
          BridgeTransactionStatus.Pending,
        ),
        tokenStorageService.getBridgeTransactions(
          0,
          10,
          BridgeTransactionStatus.Confirmed,
        ),
      ]);

      const runeBridgeTxs = [...pendingTxs, ...confirmedTxs].filter(
        (bridge) =>
          bridge.bridge_type === BridgeType.Import &&
          bridge.asset_infos.some(
            (asset) => asset.asset_type === BridgeAssetType.Runes,
          ),
      );

      console.log(
        `Pending and confirmed Rune bridge transactions:`,
        runeBridgeTxs,
      );

      for (const runeBridgeTx of runeBridgeTxs) {
        await this.processRuneImportBridgeTransaction(runeBridgeTx);
      }

      const pendingExportTxs = await tokenStorageService.getBridgeTransactions(
        0,
        10,
        BridgeTransactionStatus.Pending,
        BridgeType.Export,
      );
      const runeExportTxs = pendingExportTxs.filter((bridge) =>
        bridge.asset_infos.some(
          (asset) => asset.asset_type === BridgeAssetType.Runes,
        ),
      );

      for (const runeExportTx of runeExportTxs) {
        await this.processRuneExportBridgeTransaction(runeExportTx);
      }
    }, MEMPOOL_API_POOLING_INTERVAL_SECONDS * 1000);
  }

  async processRuneImportBridgeTransaction(
    bridgeTx: BridgeTransaction,
  ): Promise<void> {
    console.log(`Processing import Rune bridge transaction`, bridgeTx);

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

      console.log(
        `Ticket status for ticket ID ${bridgeTx.omnity_ticket_id}:`,
        ticketStatusResult.unwrap(),
      );

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

  async processRuneExportBridgeTransaction(
    bridgeTx: BridgeTransaction,
  ): Promise<void> {
    console.log(`Processing export Rune bridge transaction`, bridgeTx);

    let btcTxId = bridgeTx.btc_txid;

    if (!btcTxId && bridgeTx.omnity_ticket_id) {
      const queryTxHashResult = await omnityHubService.queryTxHash(
        bridgeTx.omnity_ticket_id,
      );
      if (queryTxHashResult.isOk()) {
        btcTxId = queryTxHashResult.unwrap();
        console.log("btc txid from Omnity Hub:", btcTxId);
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
      } else {
        console.warn(
          `Failed to query Rune export btc_txid from Omnity Hub for ${bridgeTx.bridge_id}:`,
          queryTxHashResult.unwrapErr(),
        );
      }
    }

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
      btcTxId,
    );

    if (updateResult.isOk()) {
      this.#bridgeTxQuery.refresh();
      this.#exportBridgeTxQuery.refresh();
    }
  }

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

      console.log(
        `Manually refreshing balance for Rune ID ${runeId} at address ${runeAddress}...`,
      );

      const utxoResult = await mempoolService.getAddressUtxos(runeAddress);
      if (utxoResult.isErr()) {
        return Err(utxoResult.unwrapErr());
      }

      console.log(`UTXOs for address ${runeAddress}:`, utxoResult.unwrap());

      const existingUtxos = new Set(
        this.getImportBridgeTransactionsForToken({
          address: "",
          isRune: true,
          runeInfo: token.runeInfo,
        }).flatMap((bridge) =>
          bridge.vout.map((utxo) => `${utxo.txid}:${utxo.vout}`),
        ),
      );

      console.log(`Existing UTXOs in bridge transactions:`, existingUtxos);

      const unseenUtxos = utxoResult
        .unwrap()
        .filter((utxo) => !existingUtxos.has(utxo));

      if (unseenUtxos.length === 0) {
        return Ok(0);
      }

      console.log(`Unseen UTXOs to check for Rune balances:`, unseenUtxos);

      const runeBalancesResult =
        await omnityRunesIndexerService.getRuneBalancesForOutputs(unseenUtxos);
      if (runeBalancesResult.isErr()) {
        return Err(runeBalancesResult.unwrapErr());
      }

      console.log(
        `Rune balances for unseen UTXOs:`,
        runeBalancesResult.unwrap(),
      );

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

        console.log(
          `Create bridge transaction result for txid ${txid}:`,
          createResult,
        );

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
