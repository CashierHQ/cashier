import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { AddressLockedState } from "./addressLocked";
import { AddressUnlockedState } from "./addressUnlocked";

export class GateState implements UserLinkState {
  readonly step = UserLinkStep.GATE;
  #store: UserLinkStore;

  constructor(store: UserLinkStore) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    this.#store.state = new AddressUnlockedState(this.#store);
  }

  async goBack(): Promise<void> {
    this.#store.state = new AddressLockedState(this.#store);
  }

  async createAction(actionType: ActionTypeValue): Promise<Action> {
    throw new Error(
      `Action type ${actionType} cannot be created in Gate state`,
    );
  }

  async processAction(): Promise<ProcessActionResult> {
    throw new Error("Method not implemented.");
  }
}
