import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { AddressUnlockedState } from "./addressUnlocked";

// Landing state for user-facing link flow
export class LandingState implements UserLinkState {
  readonly step = UserLinkStep.LANDING;
  #store: UserLinkStore;

  constructor(store: UserLinkStore) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    this.#store.state = new AddressUnlockedState(this.#store);
  }

  async goBack(): Promise<void> {
    throw new Error("Cannot go back from Landing state.");
  }

  async goToLanding(): Promise<void> {
    throw new Error("Already at Landing state.");
  }
}
