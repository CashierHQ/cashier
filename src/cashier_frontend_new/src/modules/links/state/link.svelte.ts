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

export const linkQuery = (id: string, action?: ActionType) =>
  managedState<LinkAndAction>({
    queryFn: async () => {
      const resp = await cashierBackendService.getLink(
        id,
        // Only include action_type if action is defined
        action && {
          action_type: action.toBackendType(),
        },
      );
      if (resp.isErr()) {
        throw resp.error;
      }

      const link = Link.fromBackend(resp.value.link);
      const actionRes = fromNullable(resp.value.action);
      let actionResult: Action | undefined = undefined;
      if (actionRes) {
        actionResult = Action.fromBackend(actionRes);
      }
      return {
        link,
        action: actionResult,
      };
    },
    watch: true,
  });
