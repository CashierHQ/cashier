import { type LinkType_1 as BackendSharedLinkType } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { LinkType as SharedLinkType } from "$shared";

export type SharedLinkTypeValue =
  | typeof SharedLinkType.SendTip
  | typeof SharedLinkType.SendAirdrop
  | typeof SharedLinkType.SendTokenBasket
  | typeof SharedLinkType.ReceivePayment;

/**
 * Mapper for converting between frontend SharedLinkType and backend LinkType
 */
export class SharedLinkTypeMapper {
  /**
   * Convert frontend SharedLinkType to corresponding backend LinkType
   * @param linkType
   * @returns
   */
  static toBackendType(linkType: SharedLinkType): BackendSharedLinkType {
    switch (linkType) {
      case SharedLinkType.SendTip:
        return { SendTip: null };
      case SharedLinkType.SendAirdrop:
        return { SendAirdrop: null };
      case SharedLinkType.SendTokenBasket:
        return { SendTokenBasket: null };
      case SharedLinkType.ReceivePayment:
        return { ReceivePayment: null };
      default:
        return assertUnreachable(linkType);
    }
  }

  /**
   * Convert backend LinkType to corresponding frontend SharedLinkType
   * @param linkType
   * @returns
   */
  static toLocalType(linkType: BackendSharedLinkType): SharedLinkType {
    return rsMatch(linkType, {
      SendTip: () => SharedLinkType.SendTip,
      SendAirdrop: () => SharedLinkType.SendAirdrop,
      SendTokenBasket: () => SharedLinkType.SendTokenBasket,
      ReceivePayment: () => SharedLinkType.ReceivePayment,
    });
  }
}
