import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import type {
  CreateActionResultV3,
  ProcessActionResultV3,
} from "$modules/detailLink/types/v3/action";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { linkListStore } from "$modules/links/state/linkListStore.svelte";
import { ActionType } from "$modules/links/types/action/actionType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { ActionType as SharedActionType } from "$shared";

// State handler for the link inactive
export class LinkInactiveStateV3 implements LinkDetailStateV3 {
  readonly step = LinkStep.INACTIVE;
  #linkDetailStore: LinkDetailStoreV3;

  constructor(link: LinkDetailStoreV3) {
    this.#linkDetailStore = link;
  }

  // inactive only create withdraw action
  async createAction(
    actionType: SharedActionType,
  ): Promise<CreateActionResultV3> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    if (actionType !== ActionType.WITHDRAW) {
      throw new Error("Invalid action type for Inactive state");
    }

    const withdrawActionRes = this.#linkDetailStore.getDraftingAction(
      ActionType.WITHDRAW,
    );
    if (withdrawActionRes.isErr()) {
      throw new Error(
        `Failed to get drafting withdraw action: ${withdrawActionRes.error}`,
      );
    }

    const withdrawAction = withdrawActionRes.unwrap();
    const actionRes = await cashierBackendService.createActionV3({
      link_id: link.id,
      action: withdrawAction,
    });
    if (actionRes.isErr()) {
      throw new Error(`Failed to create action: ${actionRes.error}`);
    }

    this.#linkDetailStore.query.refresh();
    return actionRes.unwrap();
  }

  // process withdraw action
  async processAction(): Promise<ProcessActionResultV3> {
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }

    if (!this.#linkDetailStore.backendAction) {
      throw new Error("Action is missing");
    }

    const actionType = this.#linkDetailStore.backendAction.action_type;
    if (actionType !== ActionType.WITHDRAW) {
      throw new Error("Invalid action type for Inactive state");
    }

    const actionId = this.#linkDetailStore.backendAction.id;
    const result = await cashierBackendService.processActionV3(actionId);
    if (result.isErr()) {
      throw new Error(`Failed to process action: ${result.error}`);
    }

    linkListStore.refresh();
    this.#linkDetailStore.query.refresh();
    return result.unwrap();
  }
}
