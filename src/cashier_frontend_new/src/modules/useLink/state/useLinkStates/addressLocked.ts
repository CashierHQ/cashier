import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { GateState } from "./gate";
import { LandingState } from "./landing";

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
    this.#store.state = new LandingState(this.#store);
  }

  async createAction(actionType: ActionTypeValue): Promise<Action> {
    throw new Error(
      `Action type ${actionType} cannot be created in AddressLocked state`,
    );
  }

  async processAction(): Promise<ProcessActionResult> {
    throw new Error("Method not implemented.");
  }
}
