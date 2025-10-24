import type { GetLinkResp } from "$lib/generated/cashier_backend/cashier_backend.did";
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
      const resp: GetLinkResp = (
        await cashierBackendService.getLink(
          id,
          // Only include action_type if action is defined
          action && {
            action_type: action.toBackendType(),
          },
        )
      ).unwrap();

      const link = Link.fromBackend(resp.link);
      const actionRes = fromNullable(resp.action);
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
