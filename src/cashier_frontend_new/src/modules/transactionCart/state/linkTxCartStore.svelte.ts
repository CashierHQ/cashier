import type { IITransport } from "$modules/auth/signer/ii/IITransport";
import { authState } from "$modules/auth/state/auth.svelte";
import Icrc112Service from "$modules/icrc112/services/icrc112Service";
import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import IntentState, {
  type IntentStateValue,
} from "$modules/links/types/action/intentState";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import { feeService } from "$modules/shared/services/feeService";
import type { AssetAndFee } from "$modules/shared/types/feeService";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { ActionSource } from "$modules/transactionCart/types/transactionSource";
import type { TxCartStore } from "$modules/transactionCart/types/txCartStore";
import {
  AssetProcessState,
  AssetProcessStateMapper,
} from "$modules/transactionCart/types/txCart";
import type { Signer } from "@slide-computer/signer";

/**
 * Transaction cart store for Action-based (ICRC-112) transactions.
 * Handles link transactions with batch execution and intent state sync.
 */
export class LinkTxCartStore implements TxCartStore {
  #source: ActionSource;
  #icrc112Service: Icrc112Service<IITransport> | null = null;
  #assetAndFeeList = $state<AssetAndFee[]>([]);

  constructor(source: ActionSource) {
    this.#source = source;
  }

  /**
   * Update the source reference for reactive updates.
   * Call this from $effect when source prop changes.
   */
  updateSource(newSource: ActionSource): void {
    this.#source = newSource;
  }

  /** Reactive asset and fee list for UI */
  get assetAndFeeList(): AssetAndFee[] {
    return this.#assetAndFeeList;
  }

  /** Initialize ICRC-112 service */
  initialize(): void {
    const signer = authState.getSigner() as Signer<IITransport> | null;
    if (signer) {
      this.#icrc112Service = new Icrc112Service(signer);
    }
  }

  /**
   * Initialize action assets into reactive state.
   * Skip if already initialized, do not use this more than once.
   * @param tokens - Token lookup map
   */
  initializeAssets(tokens: Record<string, TokenWithPriceAndBalance>): void {
    if (this.#assetAndFeeList.length > 0) return;

    const walletPrincipal = authState.account?.owner;
    if (!walletPrincipal) return;
    this.#assetAndFeeList = feeService.buildFromAction(
      this.#source.action,
      tokens,
      walletPrincipal,
    );
  }

  /** Compute total fee in USD */
  computeFee(): number {
    return this.#assetAndFeeList.reduce(
      (sum, item) => sum + (item.fee?.usdValue ?? 0),
      0,
    );
  }

  /**
   * Sync asset states from an updated action (after handleProcessAction).
   * Matches assets by intentId and updates state from corresponding intent.
   * @param action - Updated action with latest intent states
   */
  syncStatesFromAction(action: Action): void {
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
   * Transition all assets to a new state.
   * For PROCESSING, only allows if current state is CREATED or FAILED.
   * Creates new array to trigger Svelte 5 reactivity.
   * @param state - IntentStateValue for state transition
   */
  setSourceState(state: IntentStateValue): void {
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
        newState = AssetProcessStateMapper.fromIntentState(state);
      }
      return {
        ...item,
        asset: { ...item.asset, state: newState },
      };
    });
  }

  /**
   * Execute action transaction (ICRC-112 batch + processAction).
   * Transitions asset states: CREATED → PROCESSING → SUCCESS|FAILED
   * @returns ProcessActionResult from handleProcessAction
   */
  async execute(): Promise<ProcessActionResult> {
    if (!authState.account?.owner) {
      throw new Error("User is not authenticated.");
    }

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
}
