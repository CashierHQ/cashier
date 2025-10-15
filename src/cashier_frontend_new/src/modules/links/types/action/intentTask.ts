import type { IntentTask as BackendIntentTask } from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";
import { assertUnreachable } from "$lib/rsMatch";

// Frontend representation of an IntentTask
export class IntentTask {
  private constructor(public readonly id: string) {}
  static readonly TransferWalletToLink = new IntentTask("TransferWalletToLink");
  static readonly TransferLinkToWallet = new IntentTask("TransferLinkToWallet");
  static readonly TransferWalletToTreasury = new IntentTask(
    "TransferWalletToTreasury",
  );

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

  /**
   * Exhaustive matching for IntentTask instances
   * TypeScript will ensure all cases are handled
   */
  match<T>(matcher: {
    TransferWalletToLink: () => T;
    TransferLinkToWallet: () => T;
    TransferWalletToTreasury: () => T;
  }): T {
    switch (this.id) {
      case IntentTask.TransferWalletToLink.id:
        return matcher.TransferWalletToLink();
      case IntentTask.TransferLinkToWallet.id:
        return matcher.TransferLinkToWallet();
      case IntentTask.TransferWalletToTreasury.id:
        return matcher.TransferWalletToTreasury();
      default:
        return assertUnreachable(this as never);
    }
  }
}

export default IntentTask;
