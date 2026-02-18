import { Principal } from "@dfinity/principal";
import { authState } from "$modules/auth/state/auth.svelte";
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
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import { mapV3ActionToFrontend } from "$modules/links/utils/actionV3Mapper";
import { mapV3ProcessActionResult } from "$modules/links/utils/actionV3Mapper";
import { mapV3LinkToFrontend } from "$modules/links/utils/linkV3Mapper";
import type { LinkDetailState } from ".";
import type { LinkDetailStore } from "../linkDetailStore.svelte";
import {
  ActionState as SharedActionState,
  AddressType,
  ActionType as SharedActionType,
} from "$shared";

function toVariant(value: string): Record<string, null> {
  return { [value]: null };
}

// State when the link active and ready for use
export class LinkActiveState implements LinkDetailState {
  readonly step = LinkStep.ACTIVE;
  #linkDetailStore: LinkDetailStore;

  constructor(link: LinkDetailStore) {
    this.#linkDetailStore = link;
  }

  // create action for using link
  async createAction(actionType: ActionTypeValue): Promise<Action> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    if (actionType !== ActionType.RECEIVE && actionType !== ActionType.SEND) {
      throw new Error("Invalid action type for Active state");
    }

    if (this.#linkDetailStore.linkType === LinkType.TIP_SHARED_TEST) {
      const owner = authState.account?.owner;
      if (!owner) {
        throw new Error("User must be logged in to create action");
      }
      const creator = Principal.fromText(owner);
      const sharedActionType =
        actionType === ActionType.RECEIVE
          ? SharedActionType.Receive
          : SharedActionType.Send;
      const v3Res = await cashierBackendService.createActionV3({
        link_id: link.id,
        action: {
          id: crypto.randomUUID(),
          creator,
          creator_address_type: toVariant(AddressType.User),
          action_type: toVariant(sharedActionType),
          intents: [],
          link_id: [link.id],
          intent_ids: [],
          action_state: toVariant(SharedActionState.Created),
        },
      } as never);
      if (v3Res.isErr()) {
        throw new Error(`Failed to create action: ${v3Res.error}`);
      }
      const v3 = v3Res.unwrap();
      this.#linkDetailStore.query.refresh();
      return mapV3ActionToFrontend(
        v3.action as never,
        v3.icrc112_requests as never,
      );
    }

    const actionRes = await cashierBackendService.createActionV2({
      linkId: link.id,
      actionType,
    });
    if (actionRes.isErr()) {
      throw new Error(`Failed to create action: ${actionRes.error}`);
    }

    // Refresh link detail to get the new action
    this.#linkDetailStore.query.refresh();
    return ActionMapper.fromBackendType(actionRes.unwrap());
  }

  // process the action for use link
  async processAction(): Promise<ProcessActionResult> {
    if (!this.#linkDetailStore.link) {
      throw new Error("Link is missing");
    }

    if (!this.#linkDetailStore.action) {
      throw new Error("Action is missing");
    }

    const actionType = this.#linkDetailStore.action.type;
    if (actionType !== ActionType.RECEIVE && actionType !== ActionType.SEND) {
      throw new Error("Invalid action type for Active state");
    }

    const actionId = this.#linkDetailStore.action.id;
    const linkId = this.#linkDetailStore.link.id;

    if (this.#linkDetailStore.linkType === LinkType.TIP_SHARED_TEST) {
      const result = await cashierBackendService.processActionV3({
        action_id: actionId,
      });
      if (result.isErr()) {
        throw new Error(`Failed to process action: ${result.error}`);
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
      }
      // Same as v2: refresh to pull updated data (link_user_state for Completed transition)
      this.#linkDetailStore.query.refresh();
      return mapV3ProcessActionResult(v3Response as never);
    }

    const result = await cashierBackendService.processActionV2(actionId);
    if (result.isErr()) {
      throw new Error(`Failed to process action: ${result.error}`);
    }

    linkListStore.refresh();
    this.#linkDetailStore.query.refresh();
    return ProcessActionResultMapper.fromBackendType(result.unwrap());
  }
}
