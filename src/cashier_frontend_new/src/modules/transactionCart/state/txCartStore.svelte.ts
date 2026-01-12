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
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { Signer } from "@slide-computer/signer";
import {
  AssetProcessState,
  AssetProcessStateMapper,
  WalletTransferState,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";
import IntentState, {
  type IntentStateValue,
} from "$modules/links/types/action/intentState";
import { assertUnreachable } from "$lib/rsMatch";
import { Err, Ok, type Result } from "ts-results-es";
import {
  type ExecuteResult,
  FlowDirection,
  type TransactionSource,
  isActionSource,
  isWalletSource,
} from "$modules/transactionCart/types/transaction-source";
import { ReceiveAddressType } from "$modules/wallet/types";
import type Action from "$modules/links/types/action/action";

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
   * Update the source reference for reactive updates.
   * Call this from $effect when source prop changes.
   * @param newSource - Updated source with new values (e.g., amount)
   */
  updateSource(newSource: T): void {
    this.#source = newSource;
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
    this.#assetAndFeeList = this.#buildWalletAssetListPure(tokens);
  }

  /**
   * Initialize action assets into reactive state.
   * Call this from $effect, NOT from $derived.
   * @param tokens - Token lookup map
   */
  initializeActionAssets(
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): void {
    if (!isActionSource(this.#source)) return;
    const walletPrincipal = authState.account?.owner;
    if (!walletPrincipal) return;
    this.#assetAndFeeList = feeService.mapActionToAssetAndFeeList(
      this.#source.action,
      tokens,
      walletPrincipal,
    );
  }

  /**
   * Getter for reactive asset list (for UI observation)
   */
  get assetAndFeeList(): AssetAndFee[] {
    return this.#assetAndFeeList;
  }

  /**
   * Sync asset states from an updated action (after handleProcessAction).
   * Matches assets by intentId and updates state from corresponding intent.
   * @param action - Updated action with latest intent states
   */
  syncStatesFromAction(action: Action): void {
    if (!isActionSource(this.#source)) return;
    if (!action.intents?.length) return;

    // Build lookup object of intentId -> IntentState from action intents
    const intentStateById: Record<string, IntentStateValue> = {};
    for (const intent of action.intents) {
      if (intent.id && intent.state) {
        intentStateById[intent.id] = intent.state as IntentStateValue;
      }
    }

    // Update asset states from intent states
    this.#assetAndFeeList = this.#assetAndFeeList.map((item) => {
      if (!item.asset.intentId) return item;
      const intentState = intentStateById[item.asset.intentId];
      if (!intentState) return item;

      return {
        ...item,
        asset: {
          ...item.asset,
          state: AssetProcessStateMapper.fromIntentState(intentState),
        },
      };
    });
  }

  /**
   * Transition all assets to a new state based on source type.
   * Routes to appropriate mapper: WalletTransferState or IntentState → AssetProcessState.
   * For ActionSource transitioning to PROCESSING, only allows if current state is CREATED or FAILED.
   * Creates new array to trigger Svelte 5 reactivity.
   * @param state - Source-specific state (WalletTransferState for wallet, IntentStateValue for action)
   */
  setSourceState(state: WalletTransferState | IntentStateValue): void {
    if (isWalletSource(this.#source)) {
      const assetState = AssetProcessStateMapper.fromWalletTransferState(
        state as WalletTransferState,
      );

      this.#assetAndFeeList = this.#assetAndFeeList.map((item) => ({
        ...item,
        asset: { ...item.asset, state: assetState },
      }));
    } else if (isActionSource(this.#source)) {
      // set to processing for intent only if current state is CREATED or FAILED
      this.#assetAndFeeList = this.#assetAndFeeList.map((item) => {
        let newState = item.asset.state;
        if (state === IntentState.PROCESSING) {
          if (
            item.asset.state === AssetProcessState.CREATED ||
            item.asset.state === AssetProcessState.FAILED
          ) {
            newState = AssetProcessState.PROCESSING;
          }
          // otherwise retain current state
        } else {
          newState = AssetProcessStateMapper.fromIntentState(
            state as IntentStateValue,
          );
        }
        return {
          ...item,
          asset: { ...item.asset, state: newState },
        };
      });
    } else {
      assertUnreachable(this.#source as never);
    }
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

  /**
   * Private: Action execution (ICRC-112 batch + processAction)
   * Transitions asset states: CREATED → PROCESSING → SUCCESS|FAILED
   * Uses setSourceState with IntentState for state transitions.
   * @returns ProcessActionResult from handleProcessAction
   */
  async #executeAction(): Promise<ProcessActionResult> {
    if (!isActionSource(this.#source)) throw new Error("Invalid source type");
    if (!this.#icrc112Service) {
      this.setSourceState(IntentState.FAIL);
      throw new Error("ICRC-112 Service is not initialized.");
    }

    // Transition to PROCESSING before execution
    this.setSourceState(IntentState.PROCESSING);

    const { action, handleProcessAction } = this.#source;

    try {
      if (action.icrc_112_requests && action.icrc_112_requests.length > 0) {
        await this.#icrc112Service.sendBatchRequest(
          action.icrc_112_requests,
          authState.account!.owner,
          CASHIER_BACKEND_CANISTER_ID,
        );
      }

      const result = await handleProcessAction();

      // Sync asset states from updated action (mirrors backend state)
      this.syncStatesFromAction(result.action);

      return result;
    } catch (e) {
      this.setSourceState(IntentState.FAIL);
      throw e;
    }
  }

  /**
   * Private: Wallet execution (ICP / ICRC)
   * Transitions asset states: CREATED → PROCESSING → SUCCESS|FAILED
   * Uses setSourceState with WalletTransferState for state transitions.
   * @returns bigint block index or Err string on failure
   */
  async #executeWallet(): Promise<Result<bigint, string>> {
    if (!isWalletSource(this.#source)) {
      return Err("Invalid source type");
    }

    // Transition to PROCESSING before tx
    this.setSourceState(WalletTransferState.PROCESSING);

    const { to, amount, receiveType } = this.#source;
    const isAccountId = receiveType === ReceiveAddressType.ACCOUNT_ID;
    const isPrincipal = receiveType === ReceiveAddressType.PRINCIPAL;

    try {
      let result: bigint;

      // ICP Ledger: supports both ACCOUNT_ID and PRINCIPAL
      if (this.#icpLedgerService) {
        if (isAccountId && typeof to === "string") {
          result = await this.#icpLedgerService.transferToAccount(to, amount);
        } else if (isPrincipal && typeof to !== "string") {
          result = await this.#icpLedgerService.transferToPrincipal(to, amount);
        } else {
          this.setSourceState(WalletTransferState.FAILED);
          return Err(`Invalid address type for ${receiveType}.`);
        }
        this.setSourceState(WalletTransferState.SUCCESS);
        return Ok(result);
      }

      // ICRC Ledger: supports only PRINCIPAL
      if (this.#icrcLedgerService) {
        if (!isPrincipal) {
          this.setSourceState(WalletTransferState.FAILED);
          return Err("ICRC transfer only supports principal address.");
        }
        if (typeof to === "string") {
          this.setSourceState(WalletTransferState.FAILED);
          return Err("Invalid principal address.");
        }
        result = await this.#icrcLedgerService.transferToPrincipal(to, amount);
        this.setSourceState(WalletTransferState.SUCCESS);
        return Ok(result);
      }

      this.setSourceState(WalletTransferState.FAILED);
      return Err("Ledger service is not initialized.");
    } catch (e) {
      this.setSourceState(WalletTransferState.FAILED);
      return Err((e as Error).message);
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
