import { ActionType } from "$modules/links/types/action/actionType";

/**
 * Return a user-facing heading string based on an ActionType.
 * Defaults to "You send" when action type is not provided or unrecognized.
 */
export function getHeadingFromActionType(actionType?: ActionType): string {
  if (!actionType) return "You send";
  if (actionType === ActionType.CreateLink) return "You send";
  if (actionType === ActionType.Withdraw || actionType === ActionType.Receive)
    return "You receive";
  return "You send";
}
