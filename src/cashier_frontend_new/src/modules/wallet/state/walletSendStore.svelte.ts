import { locale } from "$lib/i18n";
import { formatBalanceUnits } from "$modules/shared/utils/converter";
import { feeService } from "$modules/shared/services/feeService";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { Principal } from "@dfinity/principal";
import { Err, Ok } from "ts-results-es";
import {
  TxState,
  type ComputeSendFeeParams,
  type ExecuteSendParams,
  type ValidateSendParams,
} from "$modules/wallet/types/walletSendStore";
import type { SendFeeOutput } from "$modules/shared/types/feeService";
import {
  isValidAccountId,
  isValidPrincipal,
} from "$modules/wallet/utils/address";
import type { Result } from "ts-results-es";
import { ReceiveAddressType } from "../types";

class WalletSendStore {
  txState = $state<TxState>(TxState.CONFIRM);

  /**
   * Validate send form input
   */
  validateSend(params: ValidateSendParams): Result<true, string> {
    const { selectedToken, receiveAddress, amount, receiveType, maxAmount } =
      params;

    if (!selectedToken || selectedToken.trim() === "") {
      return Err(locale.t("wallet.send.errors.selectToken"));
    }

    if (!receiveAddress || receiveAddress.trim() === "") {
      return Err(locale.t("wallet.send.errors.enterAddress"));
    }

    if (receiveType === ReceiveAddressType.PRINCIPAL) {
      const principalResult = isValidPrincipal(receiveAddress);
      if (principalResult.isErr()) {
        return Err(locale.t("wallet.send.errors.invalidPrincipal"));
      }
    } else if (receiveType === ReceiveAddressType.ACCOUNT_ID) {
      const accountResult = isValidAccountId(receiveAddress);
      if (accountResult.isErr()) {
        return Err(locale.t("wallet.send.errors.invalidAccountId"));
      }
    }

    if (amount <= 0) {
      return Err(locale.t("wallet.send.errors.amountGreaterThanZero"));
    }

    if (amount > maxAmount) {
      return Err(
        locale
          .t("wallet.send.errors.amountExceedsMax")
          .replace("{{max}}", String(maxAmount)),
      );
    }

    return Ok(true);
  }

  /**
   * Compute send fee for confirmation display
   */
  computeSendFee(params: ComputeSendFeeParams): Result<SendFeeOutput, string> {
    const { selectedToken, amount, receiveAddress } = params;

    if (!selectedToken || amount <= 0) return Err("Invalid token or amount");

    const tokenResult = walletStore.findTokenByAddress(selectedToken);
    if (tokenResult.isErr()) return Err("Token not found");

    const token = tokenResult.unwrap();
    const amountBigInt = formatBalanceUnits(amount, token.decimals);

    return Ok(feeService.computeSendFee(amountBigInt, token, receiveAddress));
  }

  /**
   * Execute transfer based on receive type
   */
  private async transfer(
    selectedToken: string,
    receiveAddress: string,
    receiveType: ReceiveAddressType,
    amount: bigint,
  ): Promise<bigint> {
    if (receiveType === ReceiveAddressType.PRINCIPAL) {
      return walletStore.transferTokenToPrincipal(
        selectedToken,
        Principal.fromText(receiveAddress),
        amount,
      );
    }

    if (
      receiveType === ReceiveAddressType.ACCOUNT_ID &&
      selectedToken === ICP_LEDGER_CANISTER_ID
    ) {
      return walletStore.transferICPToAccount(receiveAddress, amount);
    }

    throw new Error(locale.t("wallet.send.errors.invalidReceiveType"));
  }

  /**
   * Execute the send transaction
   */
  async executeSend(
    params: ExecuteSendParams,
  ): Promise<Result<bigint, string>> {
    const { selectedToken, receiveAddress, amount, receiveType } = params;

    try {
      const tokenResult = walletStore.findTokenByAddress(selectedToken);
      if (tokenResult.isErr()) {
        return Err(locale.t("wallet.send.errors.tokenNotFound"));
      }

      const token = tokenResult.unwrap();
      const amountBigInt = formatBalanceUnits(amount, token.decimals);
      const blockId = await this.transfer(
        selectedToken,
        receiveAddress,
        receiveType,
        amountBigInt,
      );

      return Ok(blockId);
    } catch (error) {
      return Err(`${locale.t("wallet.send.errorMessagePrefix")} ${error}`);
    }
  }

  /**
   * Get transaction link for IC Dashboard
   */
  getTransactionLink(selectedToken: string, blockId: bigint): string {
    const baseUrl = "https://dashboard.internetcomputer.org";

    if (selectedToken === ICP_LEDGER_CANISTER_ID) {
      return `${baseUrl}/transaction/${blockId}`;
    }

    return `${baseUrl}/sns/${selectedToken}/transaction/${blockId}`;
  }
}

export const walletSendStore = new WalletSendStore();
