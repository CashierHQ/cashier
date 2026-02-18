import { cashierBackendService } from "$modules/links/services/cashierBackend";
import {
  ActionMapper,
  ProcessActionResultMapper,
  type ProcessActionResult,
} from "$modules/links/types/action/action";
import { mapV3ActionToFrontend } from "$modules/links/utils/actionV3Mapper";
import { mapV3ProcessActionResult } from "$modules/links/utils/actionV3Mapper";
import { mapV3LinkToFrontend } from "$modules/links/utils/linkV3Mapper";
import { LinkMapper } from "$modules/links/types/link/link";
import { linkListStore } from "$modules/links/state/linkListStore.svelte";
import type Action from "$modules/links/types/action/action";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";

// State when the link has been successfully created
export class LinkCreatedState implements LinkDetailState {
  readonly step = LinkStep.CREATED;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // Creating action is not supported in created state
  async createAction(actionType: ActionTypeValue): Promise<Action> {
    throw new Error(
      `Creating ${actionType} action is not supported in Created state`,
    );
  }

  // Process the action to activate the link
  async processAction(): Promise<ProcessActionResult> {
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }

    if (!this.#linkDetailStore.action) {
      throw new Error("Action is missing");
    }

    const actionType = this.#linkDetailStore.action.type;
    if (actionType !== ActionType.CREATE_LINK) {
      throw new Error("Invalid action type for Created state");
    }

    const actionId = this.#linkDetailStore.action.id;
    const linkId = this.#linkDetailStore.link.id;

    if (this.#linkDetailStore.linkType === LinkType.TIP_SHARED_TEST) {
      const result = await cashierBackendService.processActionV3({
        action_id: actionId,
      });
      if (result.isErr()) {
        throw new Error(`Failed to activate link: ${result.error}`);
      }
      const v3Response = result.unwrap();
      linkListStore.refresh();
      if (v3Response.is_success) {
        const mappedLink = mapV3LinkToFrontend(v3Response.link as never);
        const mappedAction = mapV3ActionToFrontend(
          v3Response.action as never,
          v3Response.icrc112_requests as never,
        );
        this.#linkDetailStore.setFromProcessResult(mappedLink, mappedAction);
      } else {
        this.#linkDetailStore.query.refresh();
      }
      return mapV3ProcessActionResult(v3Response as never);
    }

    const result = await cashierBackendService.processActionV2(actionId);
    if (result.isErr()) {
      throw new Error(`Failed to activate link: ${result.error}`);
    }
    const v2Response = result.unwrap();
    linkListStore.refresh();
    if (v2Response.is_success) {
      const mappedLink = LinkMapper.fromBackendType(v2Response.link);
      const mappedAction = ActionMapper.fromBackendType(v2Response.action);
      this.#linkDetailStore.setFromProcessResult(mappedLink, mappedAction);
    } else {
      this.#linkDetailStore.query.refresh();
    }
    return ProcessActionResultMapper.fromBackendType(v2Response);
  }
}
