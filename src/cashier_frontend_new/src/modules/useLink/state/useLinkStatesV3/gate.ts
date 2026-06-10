import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStateV3 } from "$modules/useLink/state/useLinkStatesV3";
import { AddressLockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressLocked";
import { AddressUnlockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressUnlocked";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";

export class GateStateV3 implements UserLinkStateV3 {
  readonly step = UserLinkStep.GATE;
  #store: UserLinkStoreV3;

  constructor(store: UserLinkStoreV3) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    await this.#store.refreshAsync();
    this.#store.state = new AddressUnlockedStateV3(this.#store);
  }

  async goBack(): Promise<void> {
    if (this.#store.action) {
      throw new Error("Cannot go back: action already exists");
    }
    this.#store.state = new AddressLockedStateV3(this.#store);
  }

  async goToLanding(): Promise<void> {
    if (this.#store.action) {
      throw new Error("Cannot return to Landing: action already exists");
    }
    this.#store.state = new LandingStateV3(this.#store);
  }
}
