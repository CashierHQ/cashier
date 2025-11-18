import { cashierBackendService } from "$modules/links/services/cashierBackend";
import type Action from "$modules/links/types/action/action";
import {
  ActionMapper,
  ProcessActionResultMapper,
  type ProcessActionResult,
} from "$modules/links/types/action/action";
import { ActionTypeMapper } from "$modules/links/types/action/actionType";
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
    throw new Error("Cannot go next from Address Unlocked state.");
  }

  async goBack(): Promise<void> {
    this.#store.state = new LandingState(this.#store);
  }

  async createAction(): Promise<Action> {
    if (!this.#store.linkDetail.link) {
      throw new Error("Link not loaded");
    }

    const linkId = this.#store.linkDetail.link.id;
    const actionType = ActionTypeMapper.fromLinkType(
      this.#store.linkDetail.link.link_type,
    );
    const result = await cashierBackendService.createActionV2({
      linkId,
      actionType,
    });
    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    const action = ActionMapper.fromBackendType(result.value);
    return action;
  }

  async processAction(): Promise<ProcessActionResult> {
    if (!this.#store.action) {
      throw new Error("Action not loaded");
    }

    const actionId = this.#store.action.id;
    const result = await cashierBackendService.processActionV2(actionId);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    this.#store.state = new CompletedState(this.#store);
    const processResult = ProcessActionResultMapper.fromBackendType(
      result.value,
    );
    return processResult;
  }
}
