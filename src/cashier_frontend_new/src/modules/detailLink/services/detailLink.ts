import { assertUnreachable } from "$lib/rsMatch";
import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import {
  LinkActionV3,
  LinkActionV3Mapper,
} from "$modules/detailLink/types/v3/link_action";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionMapper } from "$modules/links/types/action/action";
import {
  ActionType,
  ActionTypeMapper,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import { Link, LinkMapper } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkUserStateMapper } from "$modules/links/types/link/linkUserState";
import { LinkAction } from "$modules/links/types/linkAndAction";
import {
  type Link as SharedLink,
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
} from "$shared";
import { fromNullable } from "@dfinity/utils";
import { Err, Ok, type Result } from "ts-results-es";

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

    return undefined;
  }

  /**
   * Determine the action type based on the Link type and Link state
   * @param link
   * @returns
   */
  determineActionTypeFromLinkV3(link: SharedLink): ActionTypeValue | undefined {
    if (link.link_state === SharedLinkState.Created) {
      return ActionType.CREATE_LINK;
    } else if (link.link_state === SharedLinkState.Active) {
      switch (link.link_type) {
        case SharedLinkType.SendTip:
        case SharedLinkType.SendAirdrop:
        case SharedLinkType.SendTokenBasket:
          return ActionType.RECEIVE;
        case SharedLinkType.ReceivePayment:
          return ActionType.SEND;
        default:
          return assertUnreachable(link.link_type);
      }
    } else if (link.link_state === SharedLinkState.Inactive) {
      return ActionType.WITHDRAW;
    }

    return undefined;
  }

  /**
   * Fetch link detail with optional action type. If action type is not provided, will determine the action type based on the link state and type, and fetch the action accordingly (if not anonymous).
   * @param id link id
   * @param action optional action type to fetch specific action, if not provided, will determine based on the link state and type
   * @param anonymous whether the request is made in anonymous mode, which may skip fetching action if true since actions may require auth
   * @returns
   * - Ok(LinkAction) if fetch link detail successfully
   * - Err(Error) if any error occurs during the process
   */
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

  /**
   * Fetch linkV3 detail
   * @param id link id
   * @param actionTypeValue optional action type to fetch specific action, if not provided, will determine based on the link state and type
   * @param anonymous whether the request is made in anonymous mode, which may skip fetching action if true since actions may require auth
   * @returns
   * - Ok(LinkActionV3) if fetch link detail successfully
   * - Err(Error) if any error occurs during the process
   */
  async fetchLinkDetailV3({
    id,
    actionTypeValue,
    anonymous,
  }: {
    id: string;
    actionTypeValue?: ActionTypeValue;
    anonymous?: boolean;
  }): Promise<Result<LinkActionV3, Error>> {
    try {
      const options = actionTypeValue
        ? { action_type: ActionTypeMapper.toBackendType(actionTypeValue) }
        : undefined;

      const initialResp = await cashierBackendService.getLinkV3(
        id,
        options,
        anonymous,
      );

      if (initialResp.isErr()) return Err(initialResp.error);

      const initialRes = initialResp.unwrap();
      const sharedLink = SharedLinkMapper.toLocalType(initialRes.link);

      if (actionTypeValue) {
        const linkActionV3 = LinkActionV3Mapper.fromBackendResponse(initialRes);
        return Ok(linkActionV3);
      }

      const actionType = this.determineActionTypeFromLinkV3(sharedLink);

      if (!actionType) return Ok({ link: sharedLink });

      if (anonymous) {
        // don't fetch action when anonymous: actions may require auth
        return Ok({ link: sharedLink });
      }

      const getLinkResp = await cashierBackendService.getLinkV3(id, {
        action_type: ActionTypeMapper.toBackendType(actionType),
      });

      if (getLinkResp.isErr()) return Err(getLinkResp.error);

      const res = getLinkResp.unwrap();
      const linkActionV3 = LinkActionV3Mapper.fromBackendResponse(res);
      return Ok(linkActionV3);
    } catch (e) {
      return Err(e as Error);
    }
  }
}

export const detailLinkService = new DetailLinkService();
