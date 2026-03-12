import { assertUnreachable } from "$lib/rsMatch";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from "$modules/useLink/state/useLinkStates";
import { AddressLockedState } from "$modules/useLink/state/useLinkStates/addressLocked";
import { AddressUnlockedState } from "$modules/useLink/state/useLinkStates/addressUnlocked";
import { CompletedState } from "$modules/useLink/state/useLinkStates/completed";
import { GateState } from "$modules/useLink/state/useLinkStates/gate";
import { LandingState } from "$modules/useLink/state/useLinkStates/landing";
import type { UserLinkStateV3 } from "$modules/useLink/state/useLinkStatesV3";
import { AddressLockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressLocked";
import { AddressUnlockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressUnlocked";
import { CompletedStateV3 } from "$modules/useLink/state/useLinkStatesV3/completed";
import { GateStateV3 } from "$modules/useLink/state/useLinkStatesV3/gate";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";
import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";

// Map a UserLinkStep to the corresponding UserLinkState instance
export const userLinkStateFromStep = (
  step: UserLinkStep,
  store: UserLinkStore,
): UserLinkState => {
  switch (step) {
    case UserLinkStep.LANDING:
      return new LandingState(store);
    case UserLinkStep.ADDRESS_UNLOCKED:
      return new AddressUnlockedState(store);
    case UserLinkStep.ADDRESS_LOCKED:
      return new AddressLockedState(store);
    case UserLinkStep.GATE:
      return new GateState(store);
    case UserLinkStep.COMPLETED:
      return new CompletedState();
    default:
      assertUnreachable(step);
  }
};

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
