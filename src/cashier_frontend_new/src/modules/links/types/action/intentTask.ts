import type { IntentTask as BackendIntentTask } from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";

// Frontend representation of an IntentTask
class IntentTask {
  private constructor() {}
  static readonly TransferWalletToLink = "TransferWalletToLink";
  static readonly TransferLinkToWallet = "TransferLinkToWallet";
  static readonly TransferWalletToTreasury = "TransferWalletToTreasury";
}

export type IntentTaskValue =
  | typeof IntentTask.TransferWalletToLink
  | typeof IntentTask.TransferLinkToWallet
  | typeof IntentTask.TransferWalletToTreasury;

export class IntentTaskMapper {
  /**
   * @param b BackendIntentTask from backend
   * @returns IntentTask instance
   */
  static fromBackendType(b: BackendIntentTask): IntentTask {
    return rsMatch(b, {
      TransferWalletToLink: () => IntentTask.TransferWalletToLink,
      TransferLinkToWallet: () => IntentTask.TransferLinkToWallet,
      TransferWalletToTreasury: () => IntentTask.TransferWalletToTreasury,
    });
  }
}

export default IntentTask;
