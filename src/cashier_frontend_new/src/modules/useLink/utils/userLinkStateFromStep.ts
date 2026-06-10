import { assertUnreachable } from "$lib/rsMatch";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStateV3 } from "$modules/useLink/state/useLinkStatesV3";
import { AddressLockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressLocked";
import { AddressUnlockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressUnlocked";
import { CompletedStateV3 } from "$modules/useLink/state/useLinkStatesV3/completed";
import { GateStateV3 } from "$modules/useLink/state/useLinkStatesV3/gate";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";

export const userLinkStateFromStepV3 = (
  step: UserLinkStep,
  store: UserLinkStoreV3,
): UserLinkStateV3 => {
  switch (step) {
    case UserLinkStep.LANDING:
      return new LandingStateV3(store);
    case UserLinkStep.ADDRESS_UNLOCKED:
      return new AddressUnlockedStateV3(store);
    case UserLinkStep.ADDRESS_LOCKED:
      return new AddressLockedStateV3(store);
    case UserLinkStep.GATE:
      return new GateStateV3(store);
    case UserLinkStep.COMPLETED:
      return new CompletedStateV3();
    default:
      assertUnreachable(step);
  }
};
