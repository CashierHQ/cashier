import { assertUnreachable } from "$lib/rsMatch";
import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import {
  LinkActionV3,
  LinkActionV3Mapper,
} from "$modules/detailLink/types/v3/link_action";
import type { GetLinkDetailsResponseV3 as BackendGetLinkDetailsResponseV3 } from "$lib/generated/cashier_backend/cashier_backend.did";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import {
  ActionType,
  ActionTypeMapper,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import {
  type Link as SharedLink,
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
} from "$shared";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Service encapsulating the logic to fetch link details (possibly two calls)
 * and map backend DTOs to frontend models.
 */
export class DetailLinkService {
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

      const initialResp = anonymous
        ? await cashierBackendService.getLinkV3(id, options, true)
        : await cashierBackendService.getUserLinkDetailsV3(id, options);

      if (initialResp.isErr()) return Err(initialResp.error);

      const initialRes = initialResp.unwrap();
      const sharedLink = SharedLinkMapper.toLocalType(initialRes.link);

      if (actionTypeValue) {
        const linkActionV3 = anonymous
          ? LinkActionV3Mapper.fromBackendResponse(initialRes)
          : LinkActionV3Mapper.fromBackendGetLinkDetailsResponseV3(
              initialRes as BackendGetLinkDetailsResponseV3,
            );
        return Ok(linkActionV3);
      }

      const actionType = this.determineActionTypeFromLinkV3(sharedLink);

      if (!actionType) {
        const gates = !anonymous
          ? (initialRes as BackendGetLinkDetailsResponseV3).gates
          : undefined;
        return Ok({ link: sharedLink, gates });
      }

      if (anonymous) {
        // don't fetch action when anonymous: actions may require auth
        return Ok({ link: sharedLink });
      }

      const getLinkResp = await cashierBackendService.getUserLinkDetailsV3(id, {
        action_type: ActionTypeMapper.toBackendType(actionType),
      });

      if (getLinkResp.isErr()) return Err(getLinkResp.error);

      const res = getLinkResp.unwrap();
      const linkActionV3 =
        LinkActionV3Mapper.fromBackendGetLinkDetailsResponseV3(res);
      return Ok(linkActionV3);
    } catch (e) {
      return Err(e as Error);
    }
  }
}

export const detailLinkService = new DetailLinkService();
