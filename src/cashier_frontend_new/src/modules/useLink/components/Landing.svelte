<script lang="ts">
  import { LinkType } from "$modules/links/types/link/linkType";
  import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
  import TipLanding from "./tiplink/Landing.svelte";

  const {
    userLink,
    openLoginModal,
  }: {
    userLink: UserLinkStore;
    openLoginModal?: () => void;
  } = $props();

  const linkType = $derived.by(() => {
    return userLink.linkDetail?.link?.link_type;
  });
</script>

<div
  class="mx-auto w-[400px] max-w-full p-5 rounded-[13px] bg-lightgreen relative flex flex-col items-center justify-center overflow-hidden"
>
  {#if linkType === LinkType.TIP}
    <TipLanding {userLink} {openLoginModal} />
  {/if}
  <!-- TODO: Other link types will be added here -->
  <!-- {#if linkType === LinkType.AIRDROP}
    <AirdropLanding {userLink} {openLoginModal} />
  {/if}
  {#if linkType === LinkType.TOKEN_BASKET}
    <BasketLanding {userLink} {openLoginModal} />
  {/if}
  {#if linkType === LinkType.RECEIVE_PAYMENT}
    <PaymentLanding {userLink} {openLoginModal} />
  {/if} -->
</div>
