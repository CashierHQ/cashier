import type { LinkDetailStateV3 } from "$modules/detailLink/state/linkDetailStatesV3";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import type {
  CreateActionResultV3,
  ProcessActionResultV3,
} from "$modules/detailLink/types/v3/action";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { linkListStore } from "$modules/links/state/linkListStore.svelte";
import { LinkStep } from "$modules/links/types/linkStep";
import { ActionType as SharedActionType } from "$shared";

// State when the link has been successfully created
export class LinkCreatedStateV3 implements LinkDetailStateV3 {
  readonly step = LinkStep.CREATED;
  #linkDetailStore: LinkDetailStoreV3;

  constructor(link: LinkDetailStoreV3) {
    this.#linkDetailStore = link;
  }

  // Creating action is not supported in created state
  async createAction(
    actionType: SharedActionType,
  ): Promise<CreateActionResultV3> {
    throw new Error(
      `Creating ${actionType} action is not supported in Created state`,
    );
  }

  // Process the action to activate the link
  async processAction(): Promise<ProcessActionResultV3> {
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }

    if (!this.#linkDetailStore.backendAction) {
      throw new Error("Action is missing");
    }

    const actionType = this.#linkDetailStore.backendAction.action_type;
    if (actionType !== SharedActionType.CreateLink) {
      throw new Error("Invalid action type for Created state");
    }

    const actionId = this.#linkDetailStore.backendAction.id;
    const result = await cashierBackendService.processActionV3(actionId);
    if (result.isErr()) {
      throw new Error(`Failed to activate link: ${result.error}`);
    }

    linkListStore.refresh();
    this.#linkDetailStore.query.refresh();
    return result.unwrap();
  }
}
