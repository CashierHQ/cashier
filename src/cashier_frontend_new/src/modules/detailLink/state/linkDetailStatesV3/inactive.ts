import { authState } from "$modules/auth/state/auth.svelte";
import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import type { CreateActionResponseV3 } from "$modules/detailLink/types/dto/create_action_v3";
import type { ProcessActionResponseV3 } from "$modules/detailLink/types/dto/process_action_v3";
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
  ): Promise<CreateActionResponseV3> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    if (actionType !== ActionType.WITHDRAW) {
      throw new Error("Invalid action type for Inactive state");
    }

    // validate user is creator of the link
    if (!authState.account || !authState.account.owner) {
      throw new Error("User is not authenticated");
    }

    if (
      authState.account.owner.toLowerCase() !==
      link.creator.toText().toLowerCase()
    ) {
      throw new Error("Only the creator of the link can activate it");
    }

    // Create the withdraw action from template
    const withdrawActionRes = this.#linkDetailStore.getDraftingAction(
      ActionType.WITHDRAW,
    );
    if (withdrawActionRes.isErr()) {
      throw new Error(
        `Failed to get drafting withdraw action: ${withdrawActionRes.error}`,
      );
    }

    // Call backend to create the withdraw action
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
  async processAction(): Promise<ProcessActionResponseV3> {
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

    // validate user is creator of the link
    if (!authState.account || !authState.account.owner) {
      throw new Error("User is not authenticated");
    }

    if (
      authState.account.owner.toLowerCase() !==
      this.#linkDetailStore.link.creator.toText().toLowerCase()
    ) {
      throw new Error("Only the creator of the link can activate it");
    }

    // Call backend to process the action and withdraw the link
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
