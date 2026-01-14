import { assertUnreachable } from "$lib/rsMatch";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import {
  LinkType,
  type LinkTypeValue,
} from "$modules/links/types/link/linkType";

/**
 * Find the appropriate action type to use based on the link type
 * @param linkType
 * @returns action type to use or null if none applicable
 */
export function findUseActionTypeFromLinkType(
  linkType: LinkTypeValue,
): ActionTypeValue | null {
  switch (linkType) {
    case LinkType.TIP:
    case LinkType.AIRDROP:
      return ActionType.RECEIVE;
    case LinkType.TOKEN_BASKET:
    case LinkType.RECEIVE_PAYMENT:
      return null;
    default:
      assertUnreachable(linkType);
  }
}
