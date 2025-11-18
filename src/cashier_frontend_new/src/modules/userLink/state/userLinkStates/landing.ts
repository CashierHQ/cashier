import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { AddressLockedState } from "./addressLocked";
import { AddressUnlockedState } from "./addressUnlocked";

// Landing state for user-facing link flow
export class LandingState implements UserLinkState {
  readonly step = UserLinkStep.LANDING;
  #store: UserLinkStore;

  constructor(store: UserLinkStore) {
    this.#store = store;
  }

  // Decide path based on store.locked
  async goNext(): Promise<void> {
    if (this.#store.locked) {
      this.#store.state = new AddressLockedState(this.#store);
    } else {
      this.#store.state = new AddressUnlockedState(this.#store);
    }
  }

  async goBack(): Promise<void> {
    throw new Error("Cannot go back from Landing state.");
  }

  async createAction(actionType: ActionTypeValue): Promise<Action> {
    throw new Error("Method not implemented.");
  }

  async processAction(): Promise<ProcessActionResult> {
    throw new Error("Method not implemented.");
  }
}
