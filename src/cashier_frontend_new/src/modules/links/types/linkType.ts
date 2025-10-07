import type { LinkType as BackendLinkType } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable } from "$lib/rsMatch";

/** Frontend LinkType as a class with built-in mapping to backend union */
export class LinkType {
  private constructor(public readonly id: string) {}

  static readonly TIP = new LinkType("TIP");
  static readonly AIRDROP = new LinkType("AIRDROP");
  static readonly TOKEN_BASKET = new LinkType("TOKEN_BASKET");

  /**
   * Convert frontend LinkType to corresponding backend LinkType
   * @returns Corresponding BackendLinkType
   */
  toBackendType(): BackendLinkType {
    switch (this) {
      case LinkType.TIP:
        return { SendAirdrop: null };
      case LinkType.AIRDROP:
        return { SendAirdrop: null };
      case LinkType.TOKEN_BASKET:
        return { SendTokenBasket: null };
      default:
        return assertUnreachable(this as never);
    }
  }
}
