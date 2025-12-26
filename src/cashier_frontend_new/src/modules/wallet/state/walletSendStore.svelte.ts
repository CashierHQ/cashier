import { locale } from "$lib/i18n";
import { formatBalanceUnits } from "$modules/shared/utils/converter";
import { feeService } from "$modules/shared/services/feeService";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { Principal } from "@dfinity/principal";
import { Err, Ok, Result } from "ts-results-es";
import {
  ReceiveAddressType,
  TxState,
  type ValidationResult,
} from "../types/walletSendStore";
import type { SendFeeOutput } from "$modules/shared/types/feeService";
import { isValidAccountId, isValidPrincipal } from "../utils/address";

/**
 * WalletSendStore - Stateful singleton for send transaction flow
 * Manages form state, validation, and transaction execution
 */
class WalletSendStore {
  // Form state
  selectedToken = $state("");
  receiveAddress = $state("");
  receiveType = $state<ReceiveAddressType>(ReceiveAddressType.PRINCIPAL);
  amount = $state(0);
  tokenAmount = $state("");
  usdAmount = $state("");

  // UI state
  showConfirmDrawer = $state(false);
  txState = $state<TxState>(TxState.CONFIRM);
  errorMessage = $state("");
  isSending = $state(false);
  lastBlockId = $state<bigint | null>(null);

  /**
   * Validate send form input
   * @param maxAmount - max amount from component (derived from balance)
   * @returns Ok(true) if valid, Err(errorMessage) if invalid
   */
  validateSend(maxAmount: number): ValidationResult {
    if (!this.selectedToken || this.selectedToken.trim() === "") {
      return Err(locale.t("wallet.send.errors.selectToken"));
    }

    if (!this.receiveAddress || this.receiveAddress.trim() === "") {
      return Err(locale.t("wallet.send.errors.enterAddress"));
    }

    // Validate address format based on receive type
    if (this.receiveType === ReceiveAddressType.PRINCIPAL) {
      const principalResult = isValidPrincipal(this.receiveAddress);
      if (principalResult.isErr()) {
        return Err(locale.t("wallet.send.errors.invalidPrincipal"));
      }
    } else if (this.receiveType === ReceiveAddressType.ACCOUNT_ID) {
      const accountResult = isValidAccountId(this.receiveAddress);
      if (accountResult.isErr()) {
        return Err(locale.t("wallet.send.errors.invalidAccountId"));
      }
    }

    if (this.amount <= 0) {
      return Err(locale.t("wallet.send.errors.amountGreaterThanZero"));
    }

    if (this.amount > maxAmount) {
      return Err(
        locale
          .t("wallet.send.errors.amountExceedsMax")
          .replace("{{max}}", String(maxAmount)),
      );
    }

    return Ok(true);
  }

  /**
   * Prepare send - validate and open confirmation drawer
   * @param maxAmount - max amount from component
   */
  prepareSend(maxAmount: number): void {
    this.errorMessage = "";

    const validationResult = this.validateSend(maxAmount);
    if (validationResult.isErr()) {
      this.errorMessage = validationResult.error;
      return;
    }

    this.txState = TxState.CONFIRM;
    this.showConfirmDrawer = true;
  }

  /**
   * Get sendFeeOutput for confirmation display
   * Returns null if token not found or amount invalid
   */
  getSendFeeOutput(): SendFeeOutput | null {
    if (!this.selectedToken || this.amount <= 0) return null;

    const tokenResult = walletStore.findTokenByAddress(this.selectedToken);
    if (tokenResult.isErr()) return null;

    const token = tokenResult.unwrap();
    const amountBigInt = formatBalanceUnits(this.amount, token.decimals);

    return feeService.computeSendFee(amountBigInt, token, this.receiveAddress);
  }

  /**
   * Execute transfer based on receive type
   */
  private async transfer(amount: bigint): Promise<bigint> {
    if (this.receiveType === ReceiveAddressType.PRINCIPAL) {
      return walletStore.transferTokenToPrincipal(
        this.selectedToken,
        Principal.fromText(this.receiveAddress),
        amount,
      );
    }

    if (
      this.receiveType === ReceiveAddressType.ACCOUNT_ID &&
      this.selectedToken === ICP_LEDGER_CANISTER_ID
    ) {
      return walletStore.transferICPToAccount(this.receiveAddress, amount);
    }

    throw new Error(locale.t("wallet.send.errors.invalidReceiveType"));
  }

  /**
   * Execute the send transaction
   */
  async executeSend(onSuccess?: () => void): Promise<Result<bigint, string>> {
    this.errorMessage = "";
    this.txState = TxState.PENDING;
    this.isSending = true;

    try {
      const tokenResult = walletStore.findTokenByAddress(this.selectedToken);
      if (tokenResult.isErr()) {
        return Err(locale.t("wallet.send.errors.tokenNotFound"));
      }

      const token = tokenResult.unwrap();
      const amount = formatBalanceUnits(this.amount, token.decimals);
      const blockId = await this.transfer(amount);

      this.lastBlockId = blockId;
      this.txState = TxState.SUCCESS;
      onSuccess?.();
      return Ok(blockId);
    } catch (error) {
      this.txState = TxState.ERROR;
      this.errorMessage = `${locale.t("wallet.send.errorMessagePrefix")} ${error}`;
      this.showConfirmDrawer = false;
      return Err(this.errorMessage);
    } finally {
      this.isSending = false;
    }
  }

  /**
   * Close drawer and reset form if success
   */
  closeDrawer(): void {
    this.showConfirmDrawer = false;
    if (this.txState === TxState.SUCCESS) {
      this.resetForm();
    }
    this.txState = TxState.CONFIRM;
  }

  /**
   * Reset form fields only
   */
  resetForm(): void {
    this.receiveAddress = "";
    this.amount = 0;
    this.tokenAmount = "";
    this.usdAmount = "";
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.selectedToken = "";
    this.receiveAddress = "";
    this.receiveType = ReceiveAddressType.PRINCIPAL;
    this.amount = 0;
    this.tokenAmount = "";
    this.usdAmount = "";
    this.showConfirmDrawer = false;
    this.txState = TxState.CONFIRM;
    this.errorMessage = "";
    this.isSending = false;
    this.lastBlockId = null;
  }

  /**
   * Set selected token (e.g., from URL param or wallet list)
   */
  setSelectedToken(token: string): void {
    this.selectedToken = token;
  }

  /**
   * Set receive type
   */
  setReceiveType(type: ReceiveAddressType): void {
    this.receiveType = type;
  }

  /**
   * Get transaction link for IC Dashboard
   * ICP: https://dashboard.internetcomputer.org/transaction/<blockId>
   * SNS: https://dashboard.internetcomputer.org/sns/<canister>/transaction/<blockId>
   */
  getTransactionLink(): string | null {
    if (this.lastBlockId === null) return null;

    const baseUrl = "https://dashboard.internetcomputer.org";

    if (this.selectedToken === ICP_LEDGER_CANISTER_ID) {
      return `${baseUrl}/transaction/${this.lastBlockId}`;
    }

    // For SNS/other tokens, use the canister address
    return `${baseUrl}/sns/${this.selectedToken}/transaction/${this.lastBlockId}`;
  }
}

// Singleton export
export const walletSendStore = new WalletSendStore();
