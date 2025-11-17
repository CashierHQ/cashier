import { assertUnreachable } from "$lib/rsMatch";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from "../state/userLinkStates";
import { AddressLockedState } from "../state/userLinkStates/addressLocked";
import { AddressUnlockedState } from "../state/userLinkStates/addressUnlocked";
import { CompletedState } from "../state/userLinkStates/completed";
import { GateState } from "../state/userLinkStates/gate";
import { LandingState } from "../state/userLinkStates/landing";
import type UserLinkStore from "../state/userLinkStore.svelte";

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
      return new CompletedState(store);
    default:
      assertUnreachable(step);
  }
};
