import type { ActionType as BackendActionType } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";

// Frontend representation of action types for links
export class ActionType {
  private constructor(public readonly id: string) {}

  static readonly CreateLink = new ActionType("CREATE_LINK");
  static readonly Use = new ActionType("USE");
  static readonly Withdraw = new ActionType("WITHDRAW");
  static readonly Receive = new ActionType("RECEIVE");
  static readonly Send = new ActionType("SEND");

  /**
   * Convert frontend ActionType to corresponding BackendActionType.
   * @returns Corresponding BackendLinkType
   */
  toBackendType(): BackendActionType {
    switch (this) {
      case ActionType.CreateLink:
        return { CreateLink: null };
      case ActionType.Use:
        return { Use: null };
      case ActionType.Withdraw:
        return { Withdraw: null };
      case ActionType.Send:
        return { Send: null };
      case ActionType.Receive:
        return { Receive: null };
      default:
        return assertUnreachable(this as never);
    }
  }

  /**
   * Create frontend ActionType from corresponding backend union
   * @returns Corresponding ActionType
   */
  static fromBackendType(b: BackendActionType): ActionType {
    return rsMatch(b, {
      CreateLink: () => ActionType.CreateLink,
      Use: () => ActionType.Use,
      Withdraw: () => ActionType.Withdraw,
      Receive: () => ActionType.Receive,
      Send: () => ActionType.Send,
    });
  }
}
