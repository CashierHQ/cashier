import { locale } from "$lib/i18n";
import { formatBalanceUnits } from "$modules/shared/utils/converter";
import { feeService } from "$modules/shared/services/feeService";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { Principal } from "@dfinity/principal";
import { Err, Ok } from "ts-results-es";
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
   * Execute the send transaction
   * @param onSuccess - callback after success (e.g., refresh history)
   */
  async executeSend(onSuccess?: () => void): Promise<void> {
    this.errorMessage = "";
    this.txState = TxState.PENDING;
    this.isSending = true;

    try {
      const tokenResult = walletStore.findTokenByAddress(this.selectedToken);
      if (tokenResult.isErr()) {
        throw new Error(locale.t("wallet.send.errors.tokenNotFound"));
      }
      const token = tokenResult.unwrap();

      const balanceAmount = formatBalanceUnits(this.amount, token.decimals);

      if (this.receiveType === ReceiveAddressType.PRINCIPAL) {
        const receivePrincipal = Principal.fromText(this.receiveAddress);
        await walletStore.transferTokenToPrincipal(
          this.selectedToken,
          receivePrincipal,
          balanceAmount,
        );
      } else if (
        this.receiveType === ReceiveAddressType.ACCOUNT_ID &&
        this.selectedToken === ICP_LEDGER_CANISTER_ID
      ) {
        await walletStore.transferICPToAccount(
          this.receiveAddress,
          balanceAmount,
        );
      } else {
        throw new Error(locale.t("wallet.send.errors.invalidReceiveType"));
      }

      this.txState = TxState.SUCCESS;
      onSuccess?.();
    } catch (error) {
      this.txState = TxState.ERROR;
      this.errorMessage = `${locale.t("wallet.send.errorMessagePrefix")} ${error}`;
      this.showConfirmDrawer = false;
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
}

// Singleton export
export const walletSendStore = new WalletSendStore();
