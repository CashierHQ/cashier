import { assertUnreachable } from "$lib/rsMatch";
import {
  LinkState,
  type LinkStateValue,
} from "$modules/links/types/link/linkState";
import {
  LinkType,
  type LinkTypeValue,
} from "$modules/links/types/link/linkType";

export function getStatusLabel(
  state: LinkStateValue,
  t: (key: string) => string,
): string {
  switch (state) {
    case LinkState.CHOOSING_TYPE:
    case LinkState.ADDING_ASSET:
    case LinkState.PREVIEW:
    case LinkState.CREATE_LINK:
      return t("links.status.draft");
    case LinkState.ACTIVE:
      return t("links.status.active");
    case LinkState.INACTIVE:
      return t("links.status.inactive");
    case LinkState.INACTIVE_ENDED:
      return t("links.status.ended");
    default:
      assertUnreachable(state);
  }
}

export function getStatusClasses(state: LinkStateValue): string {
  switch (state) {
    case LinkState.CHOOSING_TYPE:
    case LinkState.ADDING_ASSET:
    case LinkState.PREVIEW:
    case LinkState.CREATE_LINK:
      return "bg-lightyellow text-yellow";
    case LinkState.ACTIVE:
      return "bg-green text-white";
    case LinkState.INACTIVE:
      return "bg-gray-200 text-gray-700";
    case LinkState.INACTIVE_ENDED:
      return "bg-red-50 text-red-700";
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
