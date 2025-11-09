<script lang="ts">
  import {
    LinkType,
    type LinkTypeValue,
  } from "$modules/links/types/link/linkType";
  import { LinkState } from "$modules/links/types/link/linkState";

  type Props = {
    href: string;
    title: string;
    linkType?: LinkTypeValue | string;
    state?: string;
    onClick?: (event: MouseEvent) => void;
  };

  let { href, title, linkType, state, onClick }: Props = $props();

  const STATE_ORDER_ARRAY = [
    "Link_state_add_assets",
    "Link_state_choose_link_type",
    "Link_state_preview",
    "Link_state_create_link",
    "Link_state_active",
    "Link_state_inactive",
    "Link_state_inactive_ended",
  ];

  function mapStringToLinkState(state: string): string {
    switch (state) {
      case "Link_state_choose_link_type":
        return "Link_state_choose_link_type";
      case "Link_state_add_assets":
        return "Link_state_add_assets";
      case "Link_state_preview":
        return "Link_state_preview";
      case "Link_state_create_link":
        return "Link_state_create_link";
      case "Link_state_active":
        return "Link_state_active";
      case "Link_state_inactive":
        return "Link_state_inactive";
      case "Link_state_inactive_ended":
        return "Link_state_inactive_ended";
      default:
        return state;
    }
  }

  function mapStringToStateIndex(state: string): number {
    const mappedState = mapStringToLinkState(state);
    const exactIndex = STATE_ORDER_ARRAY.indexOf(mappedState);
    if (exactIndex !== -1) {
      return exactIndex;
    }

    if (
      state === LinkState.CREATE_LINK ||
      mappedState === "Link_state_create_link"
    ) {
      return 3;
    }

    if (state === LinkState.ACTIVE || mappedState === "Link_state_active") {
      return 4;
    }

    if (state === LinkState.INACTIVE || mappedState === "Link_state_inactive") {
      return 5;
    }

    if (
      state === LinkState.INACTIVE_ENDED ||
      mappedState === "Link_state_inactive_ended"
    ) {
      return 6;
    }

    return -1;
  }

  function getStatusLabel(state: string): string {
    const mappedState = mapStringToLinkState(state);

    if (
      mappedState === "Link_state_choose_link_type" ||
      mappedState === "Link_state_add_assets" ||
      mappedState === "Link_state_preview" ||
      mappedState === "Link_state_create_link" ||
      state === LinkState.CREATE_LINK
    ) {
      return "Draft";
    }

    if (mappedState === "Link_state_active" || state === LinkState.ACTIVE) {
      return "Active";
    }

    if (mappedState === "Link_state_inactive" || state === LinkState.INACTIVE) {
      return "Inactive";
    }

    if (
      mappedState === "Link_state_inactive_ended" ||
      state === LinkState.INACTIVE_ENDED
    ) {
      return "Inactive";
    }

    return "Unknown state";
  }

  function getStatusClasses(state: string): string {
    const stateIndex = mapStringToStateIndex(state);

    if (stateIndex >= 0 && stateIndex <= 3) {
      return "bg-lightyellow text-yellow";
    }

    if (stateIndex === 4) {
      return "bg-green text-white";
    }

    if (stateIndex > 4) {
      return "bg-gray-200 text-gray-700";
    }

    return "bg-muted text-muted-foreground";
  }

  function getLinkDefaultAvatar(
    linkType: LinkTypeValue | string | undefined,
  ): string {
    switch (linkType) {
      case LinkType.TIP:
      case "TIP":
      case "SendTip":
        return "/tip-link-default.svg";
      case LinkType.AIRDROP:
      case "AIRDROP":
      case "SendAirdrop":
        return "/airdrop-default.svg";
      case LinkType.TOKEN_BASKET:
      case "TOKEN_BASKET":
      case "SendTokenBasket":
        return "/token-basket-default.svg";
      case LinkType.RECEIVE_PAYMENT:
      case "RECEIVE_PAYMENT":
      case "ReceivePayment":
        return "/receive-payment-default.svg";
      default:
        return "/tip-link-default.svg";
    }
  }
</script>

<a {href} onclick={onClick} class="block">
  <div class="w-full flex justify-between items-center my-3">
    <div class="flex gap-x-5 items-center">
      <div
        class="flex items-center justify-center w-[32px] h-[32px] bg-lightgreen rounded-[6px]"
      >
        <img
          alt="link"
          class="w-[18px] h-[18px] rounded-sm"
          src={getLinkDefaultAvatar(linkType)}
        />
      </div>
    </div>
    <div class="flex items-center justify-between grow ml-3">
      <div class="flex flex-col items-start justify-center">
        <h3 class="text-[14px] font-medium">{title}</h3>
      </div>
      {#if state}
        <div
          class="text-xs font-xs rounded-full px-2 py-1 {getStatusClasses(
            state,
          )}"
        >
          {getStatusLabel(state)}
        </div>
      {/if}
    </div>
  </div>
</a>
