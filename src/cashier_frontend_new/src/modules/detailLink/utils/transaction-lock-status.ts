import {
  LinkState,
  type LinkStateValue,
} from "$modules/links/types/link/linkState";

/**
 * Get transaction lock status translation key based on link state
 * ACTIVE -> Unlock (can end link, copy link)
 * INACTIVE -> Lock (can withdraw)
 * CREATE_LINK -> Unlock (can create)
 * INACTIVE_ENDED -> Ended
 */
export function getTransactionLockStatusKey(
  state: LinkStateValue | undefined,
): string {
  if (!state) return "links.linkForm.preview.transactionLockUnlock";

  switch (state) {
    case LinkState.ACTIVE:
      return "links.linkForm.preview.transactionLockUnlock";
    case LinkState.INACTIVE:
      return "links.linkForm.preview.transactionLockLock";
    case LinkState.INACTIVE_ENDED:
      return "links.linkForm.preview.transactionLockEnded";
    case LinkState.CREATE_LINK:
      return "links.linkForm.preview.transactionLockUnlock";
    default:
      return "links.linkForm.preview.transactionLockUnlock";
  }
}
