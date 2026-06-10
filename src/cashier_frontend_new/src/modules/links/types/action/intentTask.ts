import type { IntentTask as BackendIntentTask } from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";
import {
  type Intent as SharedIntent,
  AddressType as SharedAddressType,
} from "$shared";

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

  static fromSharedType(s: SharedIntent): IntentTask {
    if (s.source_address_type === SharedAddressType.Creator) {
      if (s.dest_address_type === SharedAddressType.Link) {
        return IntentTask.TRANSFER_WALLET_TO_LINK;
      } else if (
        s.dest_address_type === SharedAddressType.Treasury ||
        s.dest_address_type === SharedAddressType.Gate
      ) {
        return IntentTask.TRANSFER_WALLET_TO_TREASURY;
      }
    } else if (s.source_address_type === SharedAddressType.Link) {
      if (s.dest_address_type === SharedAddressType.Creator) {
        return IntentTask.TRANSFER_LINK_TO_WALLET;
      } else if (s.dest_address_type === SharedAddressType.User) {
        return IntentTask.TRANSFER_LINK_TO_WALLET;
      }
    }
    throw new Error(
      `Unsupported IntentTask for source ${s.source_address_type} and dest ${s.dest_address_type}`,
    );
  }
}

export default IntentTask;
