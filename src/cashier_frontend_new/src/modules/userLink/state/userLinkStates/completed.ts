import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";
import type { UserLinkStore } from "../userLinkStore.svelte";

export class CompletedState implements UserLinkState {
  readonly step = UserLinkStep.COMPLETED;
  #store: UserLinkStore;

  constructor(store: UserLinkStore) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    throw new Error("Completed is final state, cannot go next");
  }

  async goBack(): Promise<void> {
    throw new Error("Completed is final state, cannot go back");
  }

  async createAction(actionType: ActionTypeValue): Promise<Action> {
    throw new Error("Completed is final state, cannot create action");
  }

  async processAction(): Promise<ProcessActionResult> {
    throw new Error("Completed is final state, cannot process action");
  }
}
