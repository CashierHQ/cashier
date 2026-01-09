import type { IITransport } from "$modules/auth/signer/ii/IITransport";
import { authState } from "$modules/auth/state/auth.svelte";
import Icrc112Service from "$modules/icrc112/services/icrc112Service";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { FeeType, type FeeItem } from "$modules/links/types/fee";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import { feeService } from "$modules/shared/services/feeService";
import type { AssetAndFee } from "$modules/shared/types/feeService";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
import { principalToAccountId } from "$modules/shared/utils/icp-account-id";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { Signer } from "@slide-computer/signer";
import {
  AssetProcessState,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";
import { assertUnreachable } from "$lib/rsMatch";
import {
  type ExecuteResult,
  FlowDirection,
  type TransactionSource,
  isActionSource,
  isWalletSource,
} from "$modules/transactionCart/types/transaction-source";

/**
 * Generic transaction cart store supporting both Action-based (ICRC-112)
 * and Wallet-based (ICRC/ICP) transactions.
 */
export class TransactionCartStore<T extends TransactionSource> {
  #source: T;
  #icrc112Service: Icrc112Service<IITransport> | null = null;
  #icpLedgerService: IcpLedgerService | null = null;
  #icrcLedgerService: IcrcLedgerService | null = null;

  /** Reactive asset list - only used for WalletSource state transitions */
  #assetAndFeeList = $state<AssetAndFee[]>([]);

  constructor(source: T) {
    this.#source = source;
  }

  /**
   * Initialize services based on source type.
   * Must be called before execute().
   */
  initialize(): void {
    if (isActionSource(this.#source)) {
      const signer = authState.getSigner() as Signer<IITransport> | null;
      if (signer) {
        this.#icrc112Service = new Icrc112Service(signer);
      }
    } else if (isWalletSource(this.#source)) {
      const { token } = this.#source;
      // ICP uses singleton service pattern
      if (token.address === ICP_LEDGER_CANISTER_ID) {
        this.#icpLedgerService = new IcpLedgerService();
      } else {
        this.#icrcLedgerService = new IcrcLedgerService(token);
      }
    }
  }

  /**
   * Compute asset and fee list for the sources.
   * Pure function - does NOT mutate reactive state.
   * For WalletSource, use initializeWalletAssets() to populate reactive state.
   * @param tokens - Token lookup map for conversion
   * @throws Error if not authenticated
   */
  computeAssetAndFee(
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): AssetAndFee[] {
    const walletPrincipal = authState.account?.owner;
    if (!walletPrincipal) {
      throw new Error("User is not authenticated.");
    }

    if (isActionSource(this.#source)) {
      return feeService.mapActionToAssetAndFeeList(
        this.#source.action,
        tokens,
        walletPrincipal,
      );
    }
    if (isWalletSource(this.#source)) {
      // Return existing reactive state if populated, else compute fresh
      if (this.#assetAndFeeList.length > 0) {
        return this.#assetAndFeeList;
      }
      return this.#buildWalletAssetListPure(tokens);
    }
    // Exhaustive check - should never reach here
    return assertUnreachable(this.#source as never);
  }

  /**
   * Initialize wallet assets into reactive state.
   * Call this from $effect, NOT from $derived.
   * @param tokens - Token lookup map
   */
  initializeWalletAssets(
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): void {
    if (!isWalletSource(this.#source)) return;
    if (this.#assetAndFeeList.length > 0) return; // Already initialized
    this.#assetAndFeeList = this.#buildWalletAssetListPure(tokens);
  }

  /**
   * Getter for reactive asset list (for UI observation)
   */
  get assetAndFeeList(): AssetAndFee[] {
    return this.#assetAndFeeList;
  }

  /**
   * Execute transaction - return type inferred from T.
   * @returns ProcessActionResult for ActionSource, bigint (block index) for WalletSource
   */
  async execute(): Promise<ExecuteResult<T>> {
    if (!authState.account?.owner) {
      throw new Error("User is not authenticated.");
    }

    if (isActionSource(this.#source)) {
      return this.#executeAction() as unknown as ExecuteResult<T>;
    }
    return this.#executeWallet() as unknown as ExecuteResult<T>;
  }

  // ─────────────────────────────────────────────────────────────
  // Private: Action execution (ICRC-112)
  // ─────────────────────────────────────────────────────────────

  async #executeAction(): Promise<ProcessActionResult> {
    if (!isActionSource(this.#source)) throw new Error("Invalid source type");
    if (!this.#icrc112Service) {
      throw new Error("ICRC-112 Service is not initialized.");
    }

    const { action, handleProcessAction } = this.#source;

    if (action.icrc_112_requests && action.icrc_112_requests.length > 0) {
      await this.#icrc112Service.sendBatchRequest(
        action.icrc_112_requests,
        authState.account!.owner,
        CASHIER_BACKEND_CANISTER_ID,
      );
    }

    return await handleProcessAction();
  }

  // ─────────────────────────────────────────────────────────────
  // Private: Wallet execution (ICRC/ICP)
  // ─────────────────────────────────────────────────────────────

  /**
   * Update wallet asset state (WalletSource only).
   * Uses immutable update pattern for Svelte reactivity.
   */
  #setWalletAssetState(state: AssetProcessState): void {
    if (!isWalletSource(this.#source)) return;
    if (this.#assetAndFeeList.length === 0) return;

    this.#assetAndFeeList = this.#assetAndFeeList.map((item, i) =>
      i === 0 ? { ...item, asset: { ...item.asset, state } } : item,
    );
  }

  async #executeWallet(): Promise<bigint> {
    if (!isWalletSource(this.#source)) throw new Error("Invalid source type");

    // Transition to PROCESSING state
    this.#setWalletAssetState(AssetProcessState.PROCESSING);

    try {
      const { to, toAccountId, amount } = this.#source;
      let blockId: bigint;

      // ICP transfer - convert principal to accountID if needed
      if (this.#icpLedgerService) {
        const accountId = toAccountId ?? principalToAccountId(to.toText());
        if (!accountId) {
          throw new Error("Failed to derive ICP account ID from principal.");
        }
        blockId = await this.#icpLedgerService.transferToAccount(
          accountId,
          amount,
        );
      } else if (this.#icrcLedgerService) {
        // ICRC to principal
        blockId = await this.#icrcLedgerService.transferToPrincipal(to, amount);
      } else {
        throw new Error("Ledger service is not initialized.");
      }

      // Transition to SUCCEED state
      this.#setWalletAssetState(AssetProcessState.SUCCEED);
      return blockId;
    } catch (error) {
      // Transition to FAILED state
      this.#setWalletAssetState(AssetProcessState.FAILED);
      throw error;
    }
  }

  /**
   * Build AssetAndFee list for WalletSource (pure - no state mutation)
   * @param tokens - Token lookup map
   * @returns AssetAndFee list
   */
  #buildWalletAssetListPure(
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): AssetAndFee[] {
    if (!isWalletSource(this.#source)) return [];

    const { token, amount } = this.#source;
    const tokenData = tokens[token.address];
    if (!tokenData) return [];

    const fee = token.fee ?? 10_000n;
    const totalAmount = amount + fee;
    const totalAmountUi = parseBalanceUnits(totalAmount, tokenData.decimals);
    const feeUi = parseBalanceUnits(fee, tokenData.decimals);

    const asset: AssetItem = {
      state: AssetProcessState.CREATED,
      label: "",
      symbol: tokenData.symbol,
      address: token.address,
      amount: totalAmount,
      amountFormattedStr: formatNumber(totalAmountUi),
      usdValueStr: tokenData.priceUSD
        ? formatUsdAmount(totalAmountUi * tokenData.priceUSD)
        : undefined,
      // WalletSource is always outgoing (user is sender)
      direction: FlowDirection.OUTGOING,
    };

    const feeItem: FeeItem = {
      feeType: FeeType.NETWORK_FEE,
      amount: fee,
      amountFormattedStr: formatNumber(feeUi),
      symbol: tokenData.symbol,
      usdValue: tokenData.priceUSD ? feeUi * tokenData.priceUSD : undefined,
    };

    return [{ asset, fee: feeItem }];
  }
}
