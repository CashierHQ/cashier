import {
  TxState,
  type ValidateSendParams,
} from "$modules/wallet/types/walletSendStore";
import { validateSend } from "$modules/wallet/utils/validateSend";
import type { Result } from "ts-results-es";

class WalletSendStore {
  txState = $state<TxState>(TxState.CONFIRM);

  /**
   * Validate send form input
   * Delegates to validateSend utility
   */
  validateSend(params: ValidateSendParams): Result<true, string> {
    return validateSend(params);
  }
}

export const walletSendStore = new WalletSendStore();
