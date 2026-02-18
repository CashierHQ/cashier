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
import { LinkMapper } from "$modules/links/types/link/link";
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
      const errStr = String(
        actionRes.error instanceof Error
          ? actionRes.error.message
          : actionRes.error,
      );
      if (errStr.includes("NotFound") || errStr.includes("not found")) {
        const owner = authState.account?.owner;
        if (!owner) {
          throw new Error(`Failed to create action: ${actionRes.error}`);
        }
        const creator = Principal.fromText(owner);
        const v3Res = await cashierBackendService.createActionV3({
          link_id: link.id,
          action: {
            id: crypto.randomUUID(),
            creator,
            creator_address_type: toVariant(AddressType.Creator),
            action_type: toVariant(SharedActionType.Withdraw),
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
      throw new Error(`Failed to create action: ${actionRes.error}`);
    }

    this.#linkDetailStore.query.refresh();
    return ActionMapper.fromBackendType(actionRes.unwrap());
  }

  // process withdraw action
  async processAction(): Promise<ProcessActionResult> {
    const link = this.#linkDetailStore.link;
    if (!link) {
      throw new Error("Link is missing");
    }

    const action = this.#linkDetailStore.action;
    if (!action) {
      throw new Error("Action is missing");
    }

    const actionType = action.type;
    if (actionType !== ActionType.WITHDRAW) {
      throw new Error("Invalid action type for Inactive state");
    }

    const actionId = action.id;
    const result = await cashierBackendService.processActionV2(actionId);

    if (result.isErr()) {
      const errStr = String(
        result.error instanceof Error ? result.error.message : result.error,
      );
      if (errStr.includes("NotFound") || errStr.includes("not found")) {
        const v3Result = await cashierBackendService.processActionV3({
          action_id: actionId,
        });
        if (v3Result.isErr()) {
          throw new Error(`Failed to process action: ${v3Result.error}`);
        }
        const v3Response = v3Result.unwrap();
        linkListStore.refresh();
        if (v3Response.is_success) {
          const mappedLink = mapV3LinkToFrontend(v3Response.link as never);
          const mappedAction = mapV3ActionToFrontend(
            v3Response.action as never,
            v3Response.icrc112_requests as never,
          );
          this.#linkDetailStore.setFromProcessResult(mappedLink, mappedAction);
        } else {
          await this.#linkDetailStore.query.refreshAsync();
        }
        return mapV3ProcessActionResult(v3Response as never);
      }
      throw new Error(`Failed to process action: ${result.error}`);
    }

    const v2Response = result.unwrap();
    linkListStore.refresh();
    if (v2Response.is_success) {
      const mappedLink = LinkMapper.fromBackendType(v2Response.link);
      const mappedAction = ActionMapper.fromBackendType(v2Response.action);
      this.#linkDetailStore.setFromProcessResult(mappedLink, mappedAction);
    } else {
      await this.#linkDetailStore.query.refreshAsync();
    }
    return ProcessActionResultMapper.fromBackendType(v2Response);
  }
}
