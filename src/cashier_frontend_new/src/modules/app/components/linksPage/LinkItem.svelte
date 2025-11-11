<script lang="ts">
  import {
    LinkType,
    type LinkTypeValue,
  } from "$modules/links/types/link/linkType";
  import {
    LinkState,
    type LinkStateValue,
  } from "$modules/links/types/link/linkState";
  import { assertUnreachable } from "$lib/rsMatch";

  type Props = {
    title: string;
    linkType: LinkTypeValue;
    state: LinkStateValue;
    onClick: (event: MouseEvent) => void;
  };

  let { title, linkType, state, onClick }: Props = $props();

  function getStatusLabel(state: LinkStateValue): string {
    switch (state) {
      case LinkState.CHOOSING_TYPE:
      case LinkState.ADDING_ASSET:
      case LinkState.PREVIEW:
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

  function getStatusClasses(state: LinkStateValue): string {
    switch (state) {
      case LinkState.CHOOSING_TYPE:
      case LinkState.ADDING_ASSET:
      case LinkState.PREVIEW:
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

  function getLinkDefaultAvatar(linkType: LinkTypeValue): string {
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
</script>

<button onclick={onClick} class="block w-full text-left">
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
</button>
