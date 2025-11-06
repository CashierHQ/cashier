import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { CompletedState } from "./completed";
import { LandingState } from "./landing";

export class AddressUnlockedState implements UserLinkState {
  readonly step = UserLinkStep.ADDRESS_UNLOCKED;
  #store: UserLinkStore;

  constructor(store: UserLinkStore) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    this.#store.state = new CompletedState(this.#store);
  }

  async goBack(): Promise<void> {
    this.#store.state = new LandingState(this.#store);
  }
}
