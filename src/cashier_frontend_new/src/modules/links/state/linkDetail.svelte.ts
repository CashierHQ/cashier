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

export const linkDetailQuery = (id: string, action?: ActionType) =>
  managedState<LinkAndAction>({
    queryFn: async () => {
      let resp;
      
      if (action) {
        resp = await cashierBackendService.getLink(id, {
          action_type: action.toBackendType(),
        });
      } else {
        resp = await cashierBackendService.getLinkWithoutAction(id);
      }

      if (resp.isErr()) {
        throw resp.error;
      }

      const link = Link.fromBackend(resp.value.link);
      
      // Handle action if present in response
      let actionResult: Action | undefined = undefined;
      if ('action' in resp.value) {
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
