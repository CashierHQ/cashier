import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { AddressUnlockedState } from "./addressUnlocked";

export class CompletedState implements UserLinkState {
  readonly step = UserLinkStep.COMPLETED;
  #store: UserLinkStore;

  constructor(store: UserLinkStore) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    throw new Error("Completed is terminal: cannot go next");
  }

  async goBack(): Promise<void> {
    // move back to unlocked address when possible
    this.#store.state = new AddressUnlockedState(this.#store);
  }
}
