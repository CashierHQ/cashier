import type { LinkType as BackendLinkType } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";

/** Frontend LinkType as a class with built-in mapping to backend union */
export class LinkType {
  private constructor() {}

  static readonly TIP = "TIP";
  static readonly AIRDROP = "AIRDROP";
  static readonly TOKEN_BASKET = "TOKEN_BASKET";
  static readonly RECEIVE_PAYMENT = "RECEIVE_PAYMENT";
}

export type LinkTypeValue =
  | typeof LinkType.TIP
  | typeof LinkType.AIRDROP
  | typeof LinkType.TOKEN_BASKET
  | typeof LinkType.RECEIVE_PAYMENT;

export class LinkTypeMapper {
  /**
   * Convert frontend LinkType to corresponding backend LinkType
   * @returns Corresponding BackendLinkType
   */
  static toBackendType(value: LinkTypeValue): BackendLinkType {
    switch (value) {
      case LinkType.TIP:
        return { SendTip: null };
      case LinkType.AIRDROP:
        return { SendAirdrop: null };
      case LinkType.TOKEN_BASKET:
        return { SendTokenBasket: null };
      case LinkType.RECEIVE_PAYMENT:
        return { ReceivePayment: null };
      default:
        return assertUnreachable(value);
    }
  }

  static fromBackendType(b: BackendLinkType): LinkTypeValue {
    return rsMatch(b, {
      SendTip: () => LinkType.TIP,
      SendAirdrop: () => LinkType.AIRDROP,
      SendTokenBasket: () => LinkType.TOKEN_BASKET,
      ReceivePayment: () => LinkType.RECEIVE_PAYMENT,
    });
  }
}
