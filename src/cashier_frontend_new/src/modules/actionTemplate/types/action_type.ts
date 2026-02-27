import { type ActionType_1 as BackendSharedActionType } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { ActionType as SharedActionType } from "$shared";

export type SharedActionTypeValue =
  | typeof SharedActionType.CreateLink
  | typeof SharedActionType.Send
  | typeof SharedActionType.Receive
  | typeof SharedActionType.Withdraw;

/**
 * Mapper for converting between frontend SharedActionType and backend ActionType
 */
export class SharedActionTypeMapper {
  /**
   * Convert frontend SharedActionType to corresponding backend ActionType
   * @param actionType
   * @returns
   */
  static toBackendType(
    actionType: SharedActionTypeValue,
  ): BackendSharedActionType {
    switch (actionType) {
      case SharedActionType.CreateLink:
        return { CreateLink: null };
      case SharedActionType.Send:
        return { Send: null };
      case SharedActionType.Receive:
        return { Receive: null };
      case SharedActionType.Withdraw:
        return { Withdraw: null };
      default:
        return assertUnreachable(actionType);
    }
  }

  /**
   * Convert backend ActionType to corresponding frontend SharedActionType
   * @param actionType
   * @returns
   */
  static toLocalType(actionType: BackendSharedActionType): SharedActionType {
    return rsMatch(actionType, {
      CreateLink: () => SharedActionType.CreateLink,
      Send: () => SharedActionType.Send,
      Receive: () => SharedActionType.Receive,
      Withdraw: () => SharedActionType.Withdraw,
    });
  }
}
