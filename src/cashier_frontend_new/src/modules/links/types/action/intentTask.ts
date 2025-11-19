import type { IntentTask as BackendIntentTask } from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";

// Frontend representation of an IntentTask
class IntentTask {
  private constructor() {}
  static readonly TRANSFER_WALLET_TO_LINK = "TRANSFER_WALLET_TO_LINK";
  static readonly TRANSFER_LINK_TO_WALLET = "TRANSFER_LINK_TO_WALLET";
  static readonly TRANSFER_WALLET_TO_TREASURY = "TRANSFER_WALLET_TO_TREASURY";
}

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

  // Devalue serde for IntentTask: store as plain string and restore as the
  // corresponding IntentTask value (the codebase uses string constants).
  static serde = {
    serialize: {
      IntentTask: (value: unknown) => {
        if (typeof value !== "string") return undefined;
        return value;
      },
    },
    deserialize: {
      IntentTask: (obj: unknown) => {
        return obj as IntentTask;
      },
    },
  };
}

export default IntentTask;
