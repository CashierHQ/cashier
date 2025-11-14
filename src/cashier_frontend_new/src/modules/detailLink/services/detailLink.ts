import { fromNullable } from "@dfinity/utils";
import { Err, Ok, type Result } from "ts-results-es";
import { ActionMapper } from "$modules/links/types/action/action";
import {
  ActionTypeMapper,
  type ActionTypeValue,
  ActionType,
} from "$modules/links/types/action/actionType";
import { Link, LinkMapper } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import type { LinkAction } from "$modules/links/types/linkAndAction";
import { LinkUserStateMapper } from "$modules/links/types/link/linkUserState";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { assertUnreachable } from "$lib/rsMatch";

/**
 * Service encapsulating the logic to fetch link details (possibly two calls)
 * and map backend DTOs to frontend models.
 */
export class DetailLinkService {
  determineActionTypeFromLink(initialLink: Link): ActionTypeValue | undefined {
    if (initialLink.state === LinkState.CREATE_LINK)
      return ActionType.CREATE_LINK;

    if (initialLink.state === LinkState.ACTIVE) {
      switch (initialLink.link_type) {
        case LinkType.TIP:
        case LinkType.TOKEN_BASKET:
        case LinkType.AIRDROP:
          return ActionType.RECEIVE;
        case LinkType.RECEIVE_PAYMENT:
          return ActionType.SEND;
        default:
          return assertUnreachable(initialLink.link_type);
      }
    }

    if (initialLink.state === LinkState.INACTIVE) return ActionType.WITHDRAW;

    if (initialLink.state === LinkState.INACTIVE_ENDED) {
      switch (initialLink.link_type) {
        case LinkType.TIP:
        case LinkType.TOKEN_BASKET:
        case LinkType.AIRDROP:
          return ActionType.RECEIVE;
        case LinkType.RECEIVE_PAYMENT:
          return ActionType.SEND;
        default:
          return assertUnreachable(initialLink.link_type);
      }
    }

    return undefined;
  }

  async fetchLinkDetail({
    id,
    action,
    anonymous,
  }: {
    id: string;
    action?: ActionTypeValue;
    anonymous: boolean;
  }): Promise<Result<LinkAction, Error>> {
    try {
      const initialResp = action
        ? await cashierBackendService.getLink(id, {
            action_type: ActionTypeMapper.toBackendType(action),
          })
        : await cashierBackendService.getLink(id, undefined, { anonymous });

      if (initialResp.isErr()) return Err(initialResp.error);

      const initialLink = LinkMapper.fromBackendType(initialResp.value.link);

      if (action) {
        const actionDto = fromNullable(initialResp.value.action);
        const linkUserState = fromNullable(
          initialResp.value.link_user_state.state,
        );
        return Ok({
          link: initialLink,
          action: actionDto
            ? ActionMapper.fromBackendType(actionDto)
            : undefined,
          link_user_state: linkUserState
            ? LinkUserStateMapper.fromBackendType(linkUserState)
            : undefined,
        });
      }

      const actionType = this.determineActionTypeFromLink(initialLink);

      if (!actionType) return Ok({ link: initialLink, action: undefined });

      if (anonymous) {
        // don't fetch action when anonymous: actions may require auth
        return Ok({ link: initialLink, action: undefined });
      }

      const getLinkResp = await cashierBackendService.getLink(id, {
        action_type: ActionTypeMapper.toBackendType(actionType),
      });

      if (getLinkResp.isErr()) return Err(getLinkResp.error);

      const res = getLinkResp.unwrap();
      const actionDto = fromNullable(res.action);
      const linkUserState = fromNullable(
        getLinkResp.value.link_user_state.state,
      );

      console.log("linkUserState", linkUserState);

      return Ok({
        link: LinkMapper.fromBackendType(res.link),
        action: actionDto ? ActionMapper.fromBackendType(actionDto) : undefined,
        link_user_state: linkUserState
          ? LinkUserStateMapper.fromBackendType(linkUserState)
          : undefined,
      });
    } catch (e) {
      return Err(e as Error);
    }
  }
}

export const detailLinkService = new DetailLinkService();
