import { describe, it, expect } from "vitest";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { LandingState } from "../state/useLinkStates/landing";
import { AddressUnlockedState } from "../state/useLinkStates/addressUnlocked";
import { AddressLockedState } from "../state/useLinkStates/addressLocked";
import { GateState } from "../state/useLinkStates/gate";
import { CompletedState } from "../state/useLinkStates/completed";
import type { UserLinkStore } from "../state/userLinkStore.svelte";
import { userLinkStateFromStep } from "./userLinkStateFromStep";

describe("userLinkStateFromStep", () => {
  const mockStore = {} as unknown as UserLinkStore;

  it("returns LandingState for UserLinkStep.LANDING", () => {
    const s = userLinkStateFromStep(UserLinkStep.LANDING, mockStore);
    expect(s).toBeInstanceOf(LandingState);
  });

  it("returns AddressUnlockedState for UserLinkStep.ADDRESS_UNLOCKED", () => {
    const s = userLinkStateFromStep(UserLinkStep.ADDRESS_UNLOCKED, mockStore);
    expect(s).toBeInstanceOf(AddressUnlockedState);
  });

  it("returns AddressLockedState for UserLinkStep.ADDRESS_LOCKED", () => {
    const s = userLinkStateFromStep(UserLinkStep.ADDRESS_LOCKED, mockStore);
    expect(s).toBeInstanceOf(AddressLockedState);
  });

  it("returns GateState for UserLinkStep.GATE", () => {
    const s = userLinkStateFromStep(UserLinkStep.GATE, mockStore);
    expect(s).toBeInstanceOf(GateState);
  });

  it("returns CompletedState for UserLinkStep.COMPLETED", () => {
    const s = userLinkStateFromStep(UserLinkStep.COMPLETED, mockStore);
    expect(s).toBeInstanceOf(CompletedState);
  });
});
