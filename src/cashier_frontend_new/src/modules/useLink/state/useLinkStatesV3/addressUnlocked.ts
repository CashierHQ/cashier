import type { CreateActionResponseV3 } from "$modules/detailLink/types/dto/create_action_v3";
import type { ProcessActionResponseV3 } from "$modules/detailLink/types/dto/process_action_v3";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserActionCapableStateV3 } from "$modules/useLink/state/useLinkStatesV3";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { CompletedStateV3 } from "$modules/useLink/state/useLinkStatesV3/completed";

export class AddressUnlockedStateV3 implements UserActionCapableStateV3 {
  readonly step = UserLinkStep.ADDRESS_UNLOCKED;
  #store: UserLinkStoreV3;

  constructor(store: UserLinkStoreV3) {
    this.#store = store;
  }

  async goNext(): Promise<void> {
    throw new Error("Cannot go next from Address Unlocked state.");
  }

  async goBack(): Promise<void> {
    if (this.#store.action) {
      throw new Error("Cannot go back: action already exists");
    }
    this.#store.state = new LandingStateV3(this.#store);
  }

  async goToLanding(): Promise<void> {
    if (this.#store.action) {
      throw new Error("Cannot return to Landing: action already exists");
    }
    this.#store.state = new LandingStateV3(this.#store);
  }

  async createAction(
    actionType: ActionTypeValue,
  ): Promise<CreateActionResponseV3> {
    if (actionType !== ActionType.RECEIVE) {
      throw new Error(
        `Action type ${actionType} not supported in AddressUnlocked state.`,
      );
    }

    // Create the draft action from template
    const receiveActionRes = this.#store.linkDetail.getDraftingAction(
      ActionType.RECEIVE,
    );
    if (receiveActionRes.isErr()) {
      throw new Error(
        `Failed to get drafting receive action: ${receiveActionRes.error}`,
      );
    }

    const receiveAction = receiveActionRes.unwrap();

    // Call backend to create the receive action
    const actionRes = await cashierBackendService.createActionV3({
      link_id: this.#store.linkDetail.id,
      action: receiveAction,
    });

    if (actionRes.isErr()) {
      throw new Error(`Failed to create action: ${actionRes.error}`);
    }

    await this.#store.linkDetail.query.refreshAsync();
    return actionRes.unwrap();
  }

  async processAction(): Promise<ProcessActionResponseV3> {
    if (!this.#store.action) {
      throw new Error("Action is not created");
    }

    if (this.#store.action.type !== ActionType.RECEIVE) {
      throw new Error(
        `Action type ${this.#store.action.type} not supported in AddressUnlocked state.`,
      );
    }

    // Call backend to process the receive action
    const actionId = this.#store.action.id;
    const result = await cashierBackendService.processActionV3(actionId);

    if (result.isErr()) {
      throw new Error(`Failed to process action: ${result.error}`);
    }

    if (!result.unwrap().isSuccess) {
      throw new Error(
        `Action processing failed: ${result.unwrap().errors.join(", ")}`,
      );
    }

    await this.#store.linkDetail.query.refreshAsync();
    this.#store.state = new CompletedStateV3();
    return result.unwrap();
  }
}
