import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";
import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
import { GateState } from "$modules/useLink/state/useLinkStates/gate";
import { LandingState } from "$modules/useLink/state/useLinkStates/landing";

export class AddressLockedState implements UserLinkState {
  readonly step = UserLinkStep.ADDRESS_LOCKED;
  #store: UserLinkStore;

  constructor(store: UserLinkStore) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    this.#store.state = new GateState(this.#store);
  }

  async goBack(): Promise<void> {
    if (this.#store.action) {
      throw new Error("Cannot go back: action already exists");
    }
    this.#store.state = new LandingState(this.#store);
  }

  async goToLanding(): Promise<void> {
    if (this.#store.action) {
      throw new Error("Cannot return to Landing: action already exists");
    }
    this.#store.state = new LandingState(this.#store);
  }
}
