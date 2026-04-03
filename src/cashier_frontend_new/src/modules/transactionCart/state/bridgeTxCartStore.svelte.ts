import { managedState } from "$lib/managedState";
import { OMNITY_ICP_CANISTER_ID } from "$modules/bitcoin/constants";
import { ckBTCMinterService } from "$modules/bitcoin/services/ckBTCMinterService";
import { omnityHubService } from "$modules/bitcoin/services/omnityHubService";
import { omnityIcpService } from "$modules/bitcoin/services/omnityIcpService";
import type { BitcoinBlock } from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeAssetType,
  BridgeTransactionMapper,
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import { enrichBridgeTransactionWithUsdValue } from "$modules/bitcoin/utils";
import type { FeeBreakdownItem } from "$modules/links/utils/feesBreakdown";
import type { AssetAndFee } from "$modules/shared/types/feeService";
import { currentSecondTimestamp } from "$modules/shared/utils/datetimeUtils";
import {
  CKBTC_CANISTER_ID,
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { tokenPriceStore } from "$modules/token/state/tokenPriceStore.svelte";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { SvelteSet } from "svelte/reactivity";
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

  get canRetryFailedBridge() {
    return this.bridgeTransaction?.status === BridgeTransactionStatus.Failed;
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

    if (this.bridgeTransaction.bridge_type === BridgeType.Import) {
      const btcPriceUSD =
        tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID);
      if (!btcPriceUSD) {
        return 0;
      }

      return (
        (Number(this.bridgeTransaction.deposit_fee) / 100_000_000) * btcPriceUSD
      );
    }

    if (this.#isRuneExportBridge(this.bridgeTransaction)) {
      const icpPriceUSD =
        tokenPriceStore.getTokenPriceByCanisterId(ICP_LEDGER_CANISTER_ID) || 0;
      const btcPriceUSD =
        tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID) || 0;
      return (
        (Number(this.bridgeTransaction.withdrawal_fee) / 100_000_000) *
          icpPriceUSD +
        (Number(this.bridgeTransaction.btc_fee) / 100_000_000) * btcPriceUSD
      );
    }

    const btcPriceUSD =
      tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID);
    if (!btcPriceUSD) {
      return 0;
    }

    return (
      (Number(
        this.bridgeTransaction.withdrawal_fee + this.bridgeTransaction.btc_fee,
      ) /
        100_000_000) *
      btcPriceUSD
    );
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
        name: "BTC - ckBTC conversion fee",
        amount: this.bridgeTransaction.deposit_fee,
        tokenAddress: CKBTC_CANISTER_ID,
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        usdAmount: this.totalFeesUsd,
      });
    } else {
      if (this.#isRuneExportBridge(this.bridgeTransaction)) {
        feeItems.push({
          name: "Rune redeem fee",
          amount: this.bridgeTransaction.withdrawal_fee,
          tokenAddress: ICP_LEDGER_CANISTER_ID,
          tokenSymbol: "ICP",
          tokenDecimals: 8,
          usdAmount:
            (Number(this.bridgeTransaction.withdrawal_fee) / 100_000_000) *
            (tokenPriceStore.getTokenPriceByCanisterId(
              ICP_LEDGER_CANISTER_ID,
            ) || 0),
        });
        if (this.bridgeTransaction.btc_fee > 0n) {
          feeItems.push({
            name: "Network fees",
            amount: this.bridgeTransaction.btc_fee,
            tokenAddress: CKBTC_CANISTER_ID,
            tokenSymbol: "BTC",
            tokenDecimals: 8,
            usdAmount:
              (Number(this.bridgeTransaction.btc_fee) / 100_000_000) *
              (tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID) ||
                0),
          });
        }

        return feeItems;
      }

      feeItems.push({
        name: "ckBTC - BTC conversion fee",
        amount: this.bridgeTransaction.withdrawal_fee,
        tokenAddress: CKBTC_CANISTER_ID,
        tokenSymbol: "BTC",
        tokenDecimals: 8,
        usdAmount:
          (Number(this.bridgeTransaction.withdrawal_fee) / 100_000_000) *
          (tokenPriceStore.getTokenPriceByCanisterId(CKBTC_CANISTER_ID) || 0),
      });
      feeItems.push({
        name: "Network fees",
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

  /**
   * Refresh bridge transaction details by re-fetching data from the server
   */
  async refreshAsync() {
    await this.#bridgeDetailQuery.refreshAsync();
  }

  /**
   * Convert a bridge ID to an approval memo.
   * @param bridgeId The ID of the bridge transaction.
   * @returns The approval memo as a Uint8Array.
   */
  #toApprovalMemo(bridgeId: string): Uint8Array {
    // Keep the memo deterministic but bounded to the ledger memo limit.
    const bridgeIdBytes = new TextEncoder().encode(bridgeId);
    const memo = new Uint8Array(32);
    memo.set(bridgeIdBytes.slice(0, memo.length));
    return memo;
  }

  /**
   * Convert bridge created timestamp to created_at_time for ledger approval.
   * @param createdAtTs The created timestamp of the bridge transaction.
   * @returns The created_at_time in nanoseconds.
   */
  #toCreatedAtTimeNanoseconds(createdAtTs: bigint): bigint {
    return createdAtTs * 1_000_000_000n;
  }

  #isRuneExportBridge(bridge: BridgeTransactionWithUsdValue): boolean {
    return (
      bridge.bridge_type === BridgeType.Export &&
      bridge.asset_infos.some(
        (asset) => asset.asset_type === BridgeAssetType.Runes,
      )
    );
  }

  #getRuneExportToken() {
    if (!this.bridgeTransaction) {
      return null;
    }

    const runeAsset = this.bridgeTransaction.asset_infos.find(
      (asset) => asset.asset_type === BridgeAssetType.Runes,
    );
    if (!runeAsset) {
      return null;
    }

    return (walletStore.query.data ?? []).find(
      (token) => token.isRune && token.runeInfo?.runeId === runeAsset.asset_id,
    );
  }

  #buildIcpLedgerService(): IcrcLedgerService {
    return new IcrcLedgerService({
      name: "Internet Computer",
      symbol: "ICP",
      address: ICP_LEDGER_CANISTER_ID,
      decimals: 8,
      enabled: true,
      fee: ICP_LEDGER_FEE,
      is_default: true,
    });
  }

  async #approveSpenderWithAllowanceRecovery(
    ledgerService: IcrcLedgerService,
    spenderCanisterId: string,
    amount: bigint,
    memo: Uint8Array,
    createdAtTime: bigint,
  ): Promise<Result<void, string>> {
    try {
      await ledgerService.approveSpender(
        spenderCanisterId,
        amount,
        memo,
        createdAtTime,
      );
      return Ok(undefined);
    } catch (approvalError) {
      console.error(
        `Error occurred while approving spender ${spenderCanisterId}:`,
        approvalError,
      );
      try {
        const allowance =
          await ledgerService.getAllowanceForSpender(spenderCanisterId);
        console.log(`Allowance for spender ${spenderCanisterId}:`, allowance);

        if (allowance < amount) {
          return Err("Approval amount is lower than required allowance.");
        }
        return Ok(undefined);
      } catch (allowanceError) {
        return Err((allowanceError as Error).message);
      }
    }
  }

  /**
   * Update the bridge transaction status to pending with the given ckBTC block ID.
   * @param ckbtcBlockId The block ID of the ckBTC transaction.
   * @returns Result containing the updated bridge transaction or an error message.
   */
  async #updateBridgeToPending(
    ckbtcBlockId: bigint,
  ): Promise<Result<BridgeTransactionWithUsdValue, string>> {
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    const updateResult = await tokenStorageService.updateBridgeTransaction(
      this.bridgeTransaction.bridge_id,
      BridgeTransactionStatus.Pending,
      ckbtcBlockId,
      null,
    );
    if (updateResult.isErr()) {
      return Err(updateResult.unwrapErr());
    }

    await this.refreshAsync();
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction refresh failed.");
    }

    return Ok(this.bridgeTransaction);
  }

  async #updateRuneBridgeToPending(
    omnityTicketId: string,
    withdrawalFee: bigint,
  ): Promise<Result<BridgeTransactionWithUsdValue, string>> {
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    const updateResult = await tokenStorageService.updateBridgeTransaction(
      this.bridgeTransaction.bridge_id,
      BridgeTransactionStatus.Pending,
      null,
      null,
      null,
      [],
      null,
      null,
      withdrawalFee,
      null,
      null,
      omnityTicketId,
    );
    if (updateResult.isErr()) {
      return Err(updateResult.unwrapErr());
    }

    await this.refreshAsync();
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction refresh failed.");
    }

    return Ok(this.bridgeTransaction);
  }

  async retryFailedBridge(): Promise<
    Result<BridgeTransactionWithUsdValue, string>
  > {
    console.log(`Retrying failed bridge transaction`, this.bridgeTransaction);

    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    if (!this.canRetryFailedBridge) {
      return Err("Bridge transaction is not retryable.");
    }

    if (this.#isRuneExportBridge(this.bridgeTransaction)) {
      return this.#retryFailedRuneExport();
    }

    const updateResult = await tokenStorageService.updateBridgeTransaction(
      this.bridgeTransaction.bridge_id,
      BridgeTransactionStatus.Pending,
      null,
      null,
      null,
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      [],
      [],
      this.bridgeTransaction.asset_infos.map((assetInfo) => ({
        ...assetInfo,
        amount: 0n,
      })),
    );
    console.log(`Update bridge transaction to pending result:`, updateResult);

    if (updateResult.isErr()) {
      return Err(updateResult.unwrapErr());
    }

    await this.refreshAsync();
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction refresh failed.");
    }

    return Ok(this.bridgeTransaction);
  }

  async #failRuneBridge(
    errorMessage: string,
  ): Promise<Result<BridgeTransactionWithUsdValue, string>> {
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    const failResult = await tokenStorageService.updateBridgeTransaction(
      this.bridgeTransaction.bridge_id,
      BridgeTransactionStatus.Failed,
    );
    if (failResult.isErr()) {
      return Err(failResult.unwrapErr());
    }

    await this.refreshAsync();
    return Err(errorMessage);
  }

  async #recoverRuneExportWithExistingTicket(
    runeTokenId: string,
    withdrawalFee: bigint,
  ): Promise<Result<BridgeTransactionWithUsdValue, string>> {
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    const now = BigInt(currentSecondTimestamp());
    const oneDayAgo = now - 86_400n;

    const ticketsResult = await omnityHubService.getTxsWithAccount({
      sender: this.bridgeTransaction.icp_address,
      receiver: this.bridgeTransaction.btc_address,
      tokenId: runeTokenId,
      timeRange: [oneDayAgo, now],
      start: 0n,
      limit: 100n,
    });
    if (ticketsResult.isErr()) {
      return this.#failRuneBridge(ticketsResult.unwrapErr());
    }

    const allBridges = await tokenStorageService.getBridgeTransactions(0, 100);
    const seenTicketIds = new SvelteSet(
      allBridges
        .map((bridge) => bridge.omnity_ticket_id)
        .filter((ticketId): ticketId is string => !!ticketId),
    );

    const unseenTickets = ticketsResult
      .unwrap()
      .filter(
        (ticket) =>
          ticket.token === runeTokenId &&
          ticket.receiver === this.bridgeTransaction?.btc_address &&
          !seenTicketIds.has(ticket.ticket_id) &&
          "Redeem" in ticket.action,
      )
      .sort((left, right) => Number(right.ticket_time - left.ticket_time));

    if (unseenTickets.length === 0) {
      return this.#failRuneBridge(
        "Unable to recover Rune export bridge transaction.",
      );
    }

    return this.#updateRuneBridgeToPending(
      unseenTickets[0].ticket_id,
      withdrawalFee,
    );
  }

  /**
   * Recover pending export bridge by checking the retrieval request status from the ckBTC minter
   * @returns Result containing the updated bridge transaction or an error message.
   */
  async #recoverPendingExportFromAccountStatus(): Promise<
    Result<BridgeTransactionWithUsdValue, string>
  > {
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    const statusByAccountResult =
      await ckBTCMinterService.retrieveBtcStatusV2ByAccount();
    if (statusByAccountResult.isErr()) {
      return Err(statusByAccountResult.unwrapErr());
    }

    const exportBridges = await tokenStorageService.getBridgeTransactions(
      0,
      100,
    );
    const seenBlockIds = new SvelteSet(
      exportBridges
        .filter(
          (bridge) =>
            bridge.bridge_type === BridgeType.Export &&
            bridge.ckbtc_block_id !== null,
        )
        .map((bridge) => bridge.ckbtc_block_id?.toString()),
    );

    const unseenBlockIds = statusByAccountResult
      .unwrap()
      .map((item) => item.block_index)
      .filter((blockIndex) => !seenBlockIds.has(blockIndex.toString()))
      .sort((left, right) => Number(right - left));

    if (unseenBlockIds.length > 0) {
      return this.#updateBridgeToPending(unseenBlockIds[0]);
    }

    const failResult = await tokenStorageService.updateBridgeTransaction(
      this.bridgeTransaction.bridge_id,
      BridgeTransactionStatus.Failed,
    );
    if (failResult.isErr()) {
      return Err(failResult.unwrapErr());
    }

    await this.refreshAsync();
    return Err("Unable to recover export bridge transaction.");
  }

  /**
   * Process the export bridge transaction.
   * @returns Result containing the updated bridge transaction or an error message
   */
  async executeExport(): Promise<
    Result<BridgeTransactionWithUsdValue, string>
  > {
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    if (!this.canConfirmExport) {
      return Err("Bridge transaction is not ready for confirmation.");
    }

    if (this.#isRuneExportBridge(this.bridgeTransaction)) {
      return this.#executeRuneExport();
    }

    const approvalAmount = this.bridgeTransaction.total_amount;
    const approvalMemo = this.#toApprovalMemo(this.bridgeTransaction.bridge_id);
    const approvalCreatedAtTime = this.#toCreatedAtTimeNanoseconds(
      this.bridgeTransaction.created_at_ts,
    );

    try {
      await this.#ckBtcLedgerService.approveCkBtcWithdrawal(
        approvalAmount,
        approvalMemo,
        approvalCreatedAtTime,
      );
    } catch {
      try {
        const allowance =
          await this.#ckBtcLedgerService.getAllowanceForCkBtcMinter();
        if (allowance < approvalAmount) {
          return this.#recoverPendingExportFromAccountStatus();
        }
      } catch (allowanceError) {
        return Err((allowanceError as Error).message);
      }
    }

    const retrieveResult = await ckBTCMinterService.retrieveBtcWithApproval(
      this.bridgeTransaction.btc_address,
      this.bridgeTransaction.total_amount,
    );
    if (retrieveResult.isErr()) {
      return this.#recoverPendingExportFromAccountStatus();
    }

    return this.#updateBridgeToPending(retrieveResult.unwrap());
  }

  async #runRuneExportFaultToleranceFlow(): Promise<
    Result<BridgeTransactionWithUsdValue, string>
  > {
    console.log(
      `Running Rune export fault tolerance flow for bridge transaction`,
      this.bridgeTransaction,
    );
    if (!this.bridgeTransaction) {
      return Err("Bridge transaction not found.");
    }

    const runeToken = this.#getRuneExportToken();
    if (!runeToken?.runeInfo?.tokenId) {
      return Err("Rune token metadata not found.");
    }

    const approvalMemo = this.#toApprovalMemo(this.bridgeTransaction.bridge_id);
    const approvalCreatedAtTime = this.#toCreatedAtTimeNanoseconds(
      this.bridgeTransaction.created_at_ts,
    );

    const redeemFeeResult = await omnityIcpService.getRedeemFee("Bitcoin");
    if (redeemFeeResult.isErr()) {
      return Err(redeemFeeResult.unwrapErr());
    }

    const redeemFee = redeemFeeResult.unwrap();
    console.log(`Redeem fee for Rune export:`, redeemFee);

    const icpApprovalResult = await this.#approveSpenderWithAllowanceRecovery(
      this.#buildIcpLedgerService(),
      OMNITY_ICP_CANISTER_ID,
      redeemFee,
      approvalMemo,
      approvalCreatedAtTime,
    );
    console.log(`icp approval result:`, icpApprovalResult);

    if (icpApprovalResult.isErr()) {
      return this.#failRuneBridge(icpApprovalResult.unwrapErr());
    }

    const runeApprovalResult = await this.#approveSpenderWithAllowanceRecovery(
      new IcrcLedgerService(runeToken),
      OMNITY_ICP_CANISTER_ID,
      this.bridgeTransaction.total_amount,
      approvalMemo,
      approvalCreatedAtTime,
    );
    console.log(`rune approval result:`, runeApprovalResult);
    if (runeApprovalResult.isErr()) {
      return this.#failRuneBridge(runeApprovalResult.unwrapErr());
    }

    const ticketResult = await omnityIcpService.generateTicketV2({
      action: { Redeem: null },
      token_id: runeToken.runeInfo.tokenId,
      from_subaccount: [],
      target_chain_id: "Bitcoin",
      amount: this.bridgeTransaction.total_amount,
      receiver: this.bridgeTransaction.btc_address,
    });
    console.log(`Generate ticketV2 result for Rune export:`, ticketResult);

    if (ticketResult.isErr()) {
      return this.#recoverRuneExportWithExistingTicket(
        runeToken.runeInfo.tokenId,
        redeemFee,
      );
    }

    return this.#updateRuneBridgeToPending(ticketResult.unwrap(), redeemFee);
  }

  async #executeRuneExport(): Promise<
    Result<BridgeTransactionWithUsdValue, string>
  > {
    return this.#runRuneExportFaultToleranceFlow();
  }

  async #retryFailedRuneExport(): Promise<
    Result<BridgeTransactionWithUsdValue, string>
  > {
    return this.#runRuneExportFaultToleranceFlow();
  }
}
