import type { IntentTask as BackendIntentTask } from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";

export class IntentTask {
  private constructor(public readonly id: string) {}
  static readonly TransferWalletToLink = new IntentTask("TransferWalletToLink");
  static readonly TransferLinkToWallet = new IntentTask("TransferLinkToWallet");
  static readonly TransferWalletToTreasury = new IntentTask(
    "TransferWalletToTreasury",
  );

  static fromBackendType(b: BackendIntentTask): IntentTask {
    return rsMatch(b, {
      TransferWalletToLink: () => IntentTask.TransferWalletToLink,
      TransferLinkToWallet: () => IntentTask.TransferLinkToWallet,
      TransferWalletToTreasury: () => IntentTask.TransferWalletToTreasury,
    });
  }
}

export default IntentTask;
