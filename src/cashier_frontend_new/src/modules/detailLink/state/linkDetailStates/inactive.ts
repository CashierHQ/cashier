import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { linkListStore } from "$modules/links/state/linkListStore.svelte";
import type Action from "$modules/links/types/action/action";
import {
  ActionMapper,
  ProcessActionResultMapper,
  type ProcessActionResult,
} from "$modules/links/types/action/action";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";

// State when the link inactive
export class LinkInactiveState implements LinkDetailState {
  readonly step = LinkStep.INACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // inactive only create withdraw action
  async createAction(actionType: ActionTypeValue): Promise<Action> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    if (actionType !== ActionType.WITHDRAW) {
      throw new Error("Invalid action type for Inactive state");
    }

    const actionRes = await cashierBackendService.createActionV2({
      linkId: link.id,
      actionType,
    });

    if (actionRes.isErr()) {
      throw actionRes.error;
    }

    this.#linkDetailStore.query.refresh();
    return ActionMapper.fromBackendType(actionRes.unwrap());
  }

  // process withdraw action
  async processAction(actionId: string): Promise<ProcessActionResult> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }
    const result = await cashierBackendService.processActionV2(actionId);
    if (result.isErr()) {
      throw new Error(`Failed to activate link: ${result.error}`);
    }

    linkListStore.refresh();
    this.#linkDetailStore.query.refresh();
    return ProcessActionResultMapper.fromBackendType(result.unwrap());
  }
}
