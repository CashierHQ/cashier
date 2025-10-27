import { managedState } from "$lib/managedState";
import { fromNullable } from "@dfinity/utils";
import { cashierBackendService } from "../services/cashierBackend";
import Action from "../types/action/action";
import type { ActionType } from "../types/action/actionType";
import { Link } from "../types/link/link";

// A state for the user tokens list

export type LinkAndAction = {
  link: Link;
  action?: Action;
};

/**
 * Fetch link detail along with optional action
 * @param id Link ID
 * @param action Optional action type to fetch along with the link
 * @returns Managed state containing link and optional action
 */
export const linkDetailQuery = (id: string, action?: ActionType) =>
  managedState<LinkAndAction>({
    queryFn: async () => {
      let resp;

      // Fetch link with action, normally used with createLink and withdraw flow
      if (action) {
        resp = await cashierBackendService.getLink(id, {
          action_type: action.toBackendType(),
        });
      } else {
        // Fetch link without action, normally used for Send or Receive link detail view
        resp = await cashierBackendService.getLinkWithoutAction(id);
      }

      if (resp.isErr()) {
        throw resp.error;
      }

      const link = Link.fromBackend(resp.value.link);

      // Handle action if present in response
      let actionResult: Action | undefined = undefined;
      if ("action" in resp.value) {
        const actionRes = fromNullable(resp.value.action);
        if (actionRes) {
          actionResult = Action.fromBackend(actionRes);
        }
      }

      return {
        link,
        action: actionResult,
      };
    },
    watch: true,
  });
