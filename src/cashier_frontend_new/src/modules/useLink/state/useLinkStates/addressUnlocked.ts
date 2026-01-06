import type Action from "$modules/links/types/action/action";
import { type ProcessActionResult } from "$modules/links/types/action/action";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserActionCapableState } from ".";
import type { UserLinkStore } from "../userLinkStore.svelte";
import { LandingState } from "./landing";
import { LinkState } from "$modules/links/types/link/linkState";

export class AddressUnlockedState implements UserActionCapableState {
  readonly step = UserLinkStep.ADDRESS_UNLOCKED;
  #store: UserLinkStore;

  constructor(store: UserLinkStore) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    throw new Error("Cannot go next from Address Unlocked state.");
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

  async createAction(actionType: ActionTypeValue): Promise<Action> {
    if (actionType !== ActionType.RECEIVE) {
      throw new Error(
        `Action type ${actionType} not supported in AddressUnlocked state.`,
      );
    }

    // Refetch link data to ensure we have the latest state before creating action
    await this.#store.linkDetail.query.refresh();

    const link = this.#store.link;
    if (
      link?.state === LinkState.INACTIVE ||
      link?.state === LinkState.INACTIVE_ENDED
    ) {
      throw new Error("Link is no longer available");
    }

    return await this.#store.linkDetail.createAction(actionType);
  }

  async processAction(): Promise<ProcessActionResult> {
    if (!this.#store.action) {
      throw new Error("Action is not created");
    }

    if (this.#store.action.type !== ActionType.RECEIVE) {
      throw new Error(
        `Action type ${this.#store.action.type} not supported in AddressUnlocked state.`,
      );
    }

    return await this.#store.linkDetail.processAction();
  }
}
