import type { IntentTask as BackendIntentTask } from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";

// Frontend representation of an IntentTask
class IntentTask {
  private constructor() {}
  static readonly TRANSFER_WALLET_TO_LINK = "TRANSFER_WALLET_TO_LINK";
  static readonly TRANSFER_LINK_TO_WALLET = "TRANSFER_LINK_TO_WALLET";
  static readonly TRANSFER_WALLET_TO_TREASURY = "TRANSFER_WALLET_TO_TREASURY";
}

export type IntentTaskValue =
  | typeof IntentTask.TRANSFER_WALLET_TO_LINK
  | typeof IntentTask.TRANSFER_LINK_TO_WALLET
  | typeof IntentTask.TRANSFER_WALLET_TO_TREASURY;

export class IntentTaskMapper {
  /**
   * @param b BackendIntentTask from backend
   * @returns IntentTask instance
   */
  static fromBackendType(b: BackendIntentTask): IntentTask {
    return rsMatch(b, {
      TransferWalletToLink: () => IntentTask.TRANSFER_WALLET_TO_LINK,
      TransferLinkToWallet: () => IntentTask.TRANSFER_LINK_TO_WALLET,
      TransferWalletToTreasury: () => IntentTask.TRANSFER_WALLET_TO_TREASURY,
    });
  }
}

export default IntentTask;
