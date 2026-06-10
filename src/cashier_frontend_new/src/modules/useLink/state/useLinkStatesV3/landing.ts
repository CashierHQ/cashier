import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStateV3 } from "$modules/useLink/state/useLinkStatesV3";
import { AddressLockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressLocked";
import { AddressUnlockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressUnlocked";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";

// Landing state for user-facing link flow
export class LandingStateV3 implements UserLinkStateV3 {
  readonly step = UserLinkStep.LANDING;
  #store: UserLinkStoreV3;

  constructor(store: UserLinkStoreV3) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    const gates = this.#store.linkDetail.gates;
    const allOpen =
      gates.length === 0 ||
      gates.every(
        (g) =>
          g.gate_user_status[0]?.status != null &&
          "Open" in g.gate_user_status[0].status,
      );

    if (allOpen) {
      this.#store.state = new AddressUnlockedStateV3(this.#store);
    } else {
      this.#store.state = new AddressLockedStateV3(this.#store);
    }
  }

  async goBack(): Promise<void> {
    throw new Error("Cannot go back from Landing state.");
  }

  async goToLanding(): Promise<void> {
    throw new Error("Already at Landing state.");
  }
}
