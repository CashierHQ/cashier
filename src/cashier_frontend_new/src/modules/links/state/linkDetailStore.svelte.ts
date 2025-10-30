import { managedState } from "$lib/managedState";
import { fromNullable } from "@dfinity/utils";
import { cashierBackendService } from "../services/cashierBackend";
import Action from "../types/action/action";
import { ActionType } from "../types/action/actionType";
import { Link } from "../types/link/link";
import { authState } from "$modules/auth/state/auth.svelte";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { assertUnreachable } from "$lib/rsMatch";
import { Err, Ok, type Result } from "ts-results-es";

// A state for the user tokens list

export type LinkAndAction = {
  link: Link;
  action?: Action;
};

/**
 * This method determines the appropriate ActionType based on the link's state and type.
 * 1. CREATE_LINK -> ActionType.CreateLink
 * 2. ACTIVE - this can be call anonymously
 *    - TIP, TOKEN_BASKET, AIRDROP -> ActionType.Receive
 *    - RECEIVE_PAYMENT -> ActionType.Send
 * 3. INACTIVE -> ActionType.Withdraw
 */
export const determineActionTypeFromLink = (
  initialLink: Link,
): ActionType | undefined => {
  if (initialLink.state === LinkState.CREATE_LINK) return ActionType.CreateLink;

  if (initialLink.state === LinkState.ACTIVE) {
    switch (initialLink.link_type) {
      case LinkType.TIP:
      case LinkType.TOKEN_BASKET:
      case LinkType.AIRDROP:
        return ActionType.Receive;
      case LinkType.RECEIVE_PAYMENT:
        return ActionType.Send;
      default:
        return assertUnreachable(initialLink.link_type as never);
    }
  }

  if (initialLink.state === LinkState.INACTIVE) return ActionType.Withdraw;

  return undefined;
};

/**
 * This method fetches a link
 * it will call backend twice if action is not provided,
 * first to get the link and determine the action type
 * second to get the link with the action
 * @param id
 * @param action
 * @returns
 */
export const fetchLinkDetail = async (
  id: string,
  {
    action,
    anonymous,
  }: {
    action?: ActionType;
    anonymous: boolean;
  },
): Promise<Result<LinkAndAction, Error>> => {
  try {
    // initial fetch: either with explicit action or without (respecting anonymous)
    const initialResp = action
      ? await cashierBackendService.getLink(id, {
          action_type: action.toBackendType(),
        })
      : await cashierBackendService.getLink(id, undefined, {
          anonymous,
        });

    if (initialResp.isErr()) return Err(initialResp.error);

    const initialLink = Link.fromBackend(initialResp.value.link);

    // If an explicit action was requested, return the initial response mapped
    if (action) {
      const actionDto = fromNullable(initialResp.value.action);
      return Ok({
        link: initialLink,
        action: actionDto ? Action.fromBackend(actionDto) : undefined,
      });
    }

    // determine which ActionType (if any) we should fetch alongside the link
    const actionType = determineActionTypeFromLink(initialLink);

    if (!actionType) return Ok({ link: initialLink, action: undefined });

    // If the caller requested anonymous access, avoid fetching the action
    // on the second call — actions may require authentication/permission.
    if (anonymous) {
      console.log(
        `Skipping fetching action (action_type=${actionType.id}) because anonymous=true`,
      );
      return Ok({ link: initialLink, action: undefined });
    }

    console.log(`Fetching link detail with action type: ${actionType.id}`);

    const getLinkResp = await cashierBackendService.getLink(id, {
      action_type: actionType.toBackendType(),
    });

    if (getLinkResp.isErr()) return Err(getLinkResp.error);

    const res = getLinkResp.unwrap();
    const actionDto = fromNullable(res.action);

    return Ok({
      link: Link.fromBackend(res.link),
      action: actionDto ? Action.fromBackend(actionDto) : undefined,
    });
  } catch (e) {
    return Err(e as Error);
  }
};

/**
 * Fetch link detail along with optional action
 * @param id Link ID
 * @param action Optional action type to fetch along with the link
 * @param watch Watch dependencies for re-fetching
 * @returns Managed state containing link and optional action
 */
export const linkDetailStore = ({
  id,
  action,
}: {
  id: string;
  action?: ActionType;
}) =>
  managedState<LinkAndAction>({
    queryFn: async () => {
      const linkDetail = await fetchLinkDetail(id, {
        action,
        anonymous: !authState.isLoggedIn,
      });
      if (linkDetail.isErr()) {
        throw linkDetail.error;
      }
      return linkDetail.value;
    },
    watch: true,
  });
