import { assertUnreachable } from "$lib/rsMatch";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from "../state/useLinkStates";
import { AddressLockedState } from "../state/useLinkStates/addressLocked";
import { AddressUnlockedState } from "../state/useLinkStates/addressUnlocked";
import { CompletedState } from "../state/useLinkStates/completed";
import { GateState } from "../state/useLinkStates/gate";
import { LandingState } from "../state/useLinkStates/landing";
import type { UserLinkStore } from "../state/userLinkStore.svelte";

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
