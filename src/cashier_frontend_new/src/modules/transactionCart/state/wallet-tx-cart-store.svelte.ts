import { authState } from "$modules/auth/state/auth.svelte";
import {
  AssetAndFeeListMapper,
  type AssetAndFee,
} from "$modules/shared/types/feeService";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { WalletSource } from "$modules/transactionCart/types/transaction-source";
import type { TxCartStore } from "$modules/transactionCart/types/tx-cart-store";
import {
  AssetProcessStateMapper,
  WalletTransferState,
} from "$modules/transactionCart/types/txCart";
import { ReceiveAddressType } from "$modules/wallet/types";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Transaction cart store for Wallet-based (ICRC/ICP) transactions.
 * Handles direct ledger transfers with state transitions.
 */
export class WalletTxCartStore implements TxCartStore {
  #source: WalletSource;
  #icpLedgerService: IcpLedgerService | null = null;
  #icrcLedgerService: IcrcLedgerService | null = null;
  #assetAndFeeList = $state<AssetAndFee[]>([]);

  constructor(source: WalletSource) {
    this.#source = source;
  }

  /**
   * Update the source reference for reactive updates.
   * Call this from $effect when source prop changes.
   */
  updateSource(newSource: WalletSource): void {
    this.#source = newSource;
  }

  /** Reactive asset and fee list for UI */
  get assetAndFeeList(): AssetAndFee[] {
    return this.#assetAndFeeList;
  }

  /** Initialize ICP/ICRC ledger service based on token type */
  initialize(): void {
    const { token } = this.#source;
    if (token.address === ICP_LEDGER_CANISTER_ID) {
      this.#icpLedgerService = new IcpLedgerService();
    } else {
      this.#icrcLedgerService = new IcrcLedgerService(token);
    }
  }

  /**
   * Initialize wallet assets into reactive state.
   * @param tokens - Token lookup map
   */
  initializeAssets(tokens: Record<string, TokenWithPriceAndBalance>): void {
    const { token, amount } = this.#source;
    this.#assetAndFeeList = AssetAndFeeListMapper.fromWallet(
      { amount, tokenAddress: token.address },
      tokens,
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
   * Transition all assets to a new state.
   * Creates new array to trigger Svelte 5 reactivity.
   * @param state - WalletTransferState for state transition
   */
  setSourceState(state: WalletTransferState): void {
    const assetState = AssetProcessStateMapper.fromWalletTransferState(state);
    this.#assetAndFeeList = this.#assetAndFeeList.map((item) => ({
      ...item,
      asset: { ...item.asset, state: assetState },
    }));
  }

  /**
   * Execute wallet transaction (ICP/ICRC ledger transfer).
   * Transitions asset states: CREATED → PROCESSING → SUCCESS|FAILED
   * @returns Result<bigint, string> with block index or error
   */
  async execute(): Promise<Result<bigint, string>> {
    if (!authState.account?.owner) {
      return Err("User is not authenticated.");
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
}
