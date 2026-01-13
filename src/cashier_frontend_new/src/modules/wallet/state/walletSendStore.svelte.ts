import { locale } from "$lib/i18n";
import { formatBalanceUnits } from "$modules/shared/utils/converter";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";
import {
  TxState,
  type ExecuteSendParams,
  type ValidateSendParams,
} from "$modules/wallet/types/walletSendStore";
import { ReceiveAddressType } from "$modules/wallet/types/index";
import { validateSend } from "$modules/wallet/utils/validate-send";

class WalletSendStore {
  txState = $state<TxState>(TxState.CONFIRM);

  /**
   * Validate send form input
   * Delegates to validateSend utility
   */
  validateSend(params: ValidateSendParams): Result<true, string> {
    return validateSend(params);
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
