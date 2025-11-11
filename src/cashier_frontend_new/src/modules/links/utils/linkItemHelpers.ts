import { assertUnreachable } from "$lib/rsMatch";
import {
  LinkState,
  type LinkStateValue,
} from "$modules/links/types/link/linkState";
import {
  LinkType,
  type LinkTypeValue,
} from "$modules/links/types/link/linkType";

export function getStatusLabel(state: LinkStateValue): string {
  switch (state) {
    case LinkState.CREATE_LINK:
      return "Draft";
    case LinkState.ACTIVE:
      return "Active";
    case LinkState.INACTIVE:
      return "Inactive";
    case LinkState.INACTIVE_ENDED:
      return "Inactive";
    default:
      assertUnreachable(state);
  }
}

export function getStatusClasses(state: LinkStateValue): string {
  switch (state) {
    case LinkState.CREATE_LINK:
      return "bg-lightyellow text-yellow";
    case LinkState.ACTIVE:
      return "bg-green text-white";
    case LinkState.INACTIVE:
    case LinkState.INACTIVE_ENDED:
      return "bg-gray-200 text-gray-700";
    default:
      assertUnreachable(state);
  }
}

export function getLinkDefaultAvatar(linkType: LinkTypeValue): string {
  switch (linkType) {
    case LinkType.TIP:
      return "/tip-link-default.svg";
    case LinkType.AIRDROP:
      return "/airdrop-default.svg";
    case LinkType.TOKEN_BASKET:
      return "/token-basket-default.svg";
    case LinkType.RECEIVE_PAYMENT:
      return "/receive-payment-default.svg";
    default:
      assertUnreachable(linkType);
  }
}
