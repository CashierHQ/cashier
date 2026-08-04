import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStateV3 } from "$modules/useLink/state/useLinkStatesV3";
import { GateStateV3 } from "$modules/useLink/state/useLinkStatesV3/gate";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";

export class AddressLockedStateV3 implements UserLinkStateV3 {
  readonly step = UserLinkStep.ADDRESS_LOCKED;
  #store: UserLinkStoreV3;

  constructor(store: UserLinkStoreV3) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    this.#store.state = new GateStateV3(this.#store);
  }

  async goBack(): Promise<void> {
    if (this.#store.action) {
      throw new Error("Cannot go back: action already exists");
    }
    this.#store.state = new LandingStateV3(this.#store);
  }

  async goToLanding(): Promise<void> {
    if (this.#store.action) {
      throw new Error("Cannot return to Landing: action already exists");
    }
    this.#store.state = new LandingStateV3(this.#store);
  }
}
