import { assertUnreachable } from "$lib/rsMatch";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";

/**
 * Return a user-facing heading string based on an ActionType.
 * Defaults to "You send" when action type is not provided or unrecognized.
 */
export function getHeadingFromActionType(actionType?: ActionTypeValue): string {
  if (!actionType) return "You send";
  switch (actionType) {
    case ActionType.CREATE_LINK:
    case ActionType.SEND:
      return "You send";
      break;
    case ActionType.WITHDRAW:
    case ActionType.RECEIVE:
      return "You receive";
    default:
      assertUnreachable(actionType);
  }
}
