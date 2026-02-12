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
import { LinkAction } from "$modules/links/types/linkAndAction";
import { LinkUserStateMapper } from "$modules/links/types/link/linkUserState";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { mapV3ActionToFrontend } from "$modules/links/utils/actionV3Mapper";
import { mapV3LinkToFrontend } from "$modules/links/utils/linkV3Mapper";
import { assertUnreachable } from "$lib/rsMatch";

/**
 * Service encapsulating the logic to fetch link details (possibly two calls)
 * and map backend DTOs to frontend models.
 */
export class DetailLinkService {
  private async fetchLinkDetailV3(
    id: string,
    anonymous: boolean,
  ): Promise<Result<LinkAction, Error>> {
    const resp = await cashierBackendService.getLinkDetailsV3(
      id,
      undefined,
      { anonymous },
    );
    if (resp.isErr()) return Err(resp.error);
    const v3 = resp.value;
    const link = mapV3LinkToFrontend(v3.link);
    const actionData =
      Array.isArray(v3.action) && v3.action.length > 0 ? v3.action[0] : undefined;
    const mappedAction = actionData
      ? mapV3ActionToFrontend(actionData, undefined)
      : undefined;
    const rawLinkUserState =
      v3.link_user_state && v3.link_user_state.length > 0
        ? v3.link_user_state[0]
        : undefined;
    const linkUserState = rawLinkUserState
      ? LinkUserStateMapper.fromBackendType(rawLinkUserState)
      : undefined;
    return Ok({
      link,
      action: mappedAction,
      link_user_state: linkUserState,
    });
  }

  determineActionTypeFromLink(initialLink: Link): ActionTypeValue | undefined {
    if (initialLink.state === LinkState.CREATE_LINK)
      return ActionType.CREATE_LINK;

    if (initialLink.state === LinkState.ACTIVE) {
      switch (initialLink.link_type) {
        case LinkType.TIP:
        case LinkType.TIP_SHARED_TEST:
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
        case LinkType.TIP_SHARED_TEST:
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
    linkType,
  }: {
    id: string;
    action?: ActionTypeValue;
    anonymous: boolean;
    linkType?: string;
  }): Promise<Result<LinkAction, Error>> {
    try {
      if (linkType === LinkType.TIP_SHARED_TEST) {
        return this.fetchLinkDetailV3(id, anonymous);
      }

      const initialResp = action
        ? await cashierBackendService.getLink(id, {
            action_type: ActionTypeMapper.toBackendType(action),
          })
        : await cashierBackendService.getLink(id, undefined, { anonymous });

      if (initialResp.isErr()) {
        const errMsg = String(
          initialResp.error instanceof Error
            ? initialResp.error.message
            : initialResp.error,
        );
        const isNotFound =
          errMsg.includes("NotFound") || errMsg.includes("not found");
        if (isNotFound && !action) {
          const v3Result = await this.fetchLinkDetailV3(id, anonymous);
          if (v3Result.isOk()) return v3Result;
        }
        return Err(initialResp.error);
      }

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

      return Ok(
        new LinkAction(
          initialLink,
          actionDto ? ActionMapper.fromBackendType(actionDto) : undefined,
          linkUserState
            ? LinkUserStateMapper.fromBackendType(linkUserState)
            : undefined,
        ),
      );
    } catch (e) {
      return Err(e as Error);
    }
  }
}

export const detailLinkService = new DetailLinkService();
