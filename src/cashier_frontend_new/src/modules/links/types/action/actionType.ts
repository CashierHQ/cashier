import type { ActionType as BackendActionType } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { LinkType, type LinkTypeValue } from "../link/linkType";

// Frontend representation of action types for links (string-based)
export class ActionType {
  private constructor() {}

  static readonly CREATE_LINK = "CREATE_LINK";
  static readonly USE = "USE";
  static readonly WITHDRAW = "WITHDRAW";
  static readonly RECEIVE = "RECEIVE";
  static readonly SEND = "SEND";
}

export type ActionTypeValue =
  | typeof ActionType.CREATE_LINK
  | typeof ActionType.USE
  | typeof ActionType.WITHDRAW
  | typeof ActionType.RECEIVE
  | typeof ActionType.SEND;

export class ActionTypeMapper {
  /**
   * Convert frontend ActionTypeValue to corresponding BackendActionType.
   */
  static toBackendType(value: ActionTypeValue): BackendActionType {
    switch (value) {
      case ActionType.CREATE_LINK:
        return { CreateLink: null };
      case ActionType.USE:
        return { Use: null };
      case ActionType.WITHDRAW:
        return { Withdraw: null };
      case ActionType.SEND:
        return { Send: null };
      case ActionType.RECEIVE:
        return { Receive: null };
      default:
        return assertUnreachable(value);
    }
  }

  /**
   * Create frontend ActionTypeValue from corresponding backend union
   */
  static fromBackendType(b: BackendActionType): ActionTypeValue {
    return rsMatch(b, {
      CreateLink: () => ActionType.CREATE_LINK,
      Use: () => ActionType.USE,
      Withdraw: () => ActionType.WITHDRAW,
      Receive: () => ActionType.RECEIVE,
      Send: () => ActionType.SEND,
    });
  }

  static fromLinkType(a: LinkTypeValue): ActionTypeValue {
    switch (a) {
      case LinkType.AIRDROP:
      case LinkType.TIP:
      case LinkType.TOKEN_BASKET:
        return ActionType.RECEIVE;
      case LinkType.RECEIVE_PAYMENT:
        return ActionType.SEND;
      default:
        return assertUnreachable(a);
    }
  }
}
