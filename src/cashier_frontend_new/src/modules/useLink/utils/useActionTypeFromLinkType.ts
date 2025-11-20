import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import { LinkType } from "$modules/links/types/link/linkType";

/**
 * Find the appropriate action type to use based on the link type
 * @param linkType
 * @returns action type to use or null if none applicable
 */
export function findUseActionTypeFromLinkType(
  linkType: LinkType,
): ActionTypeValue | null {
  switch (linkType) {
    case LinkType.TIP:
      return ActionType.RECEIVE;
    default:
      return null;
  }
}
