<script lang="ts">
  import { LinkType } from "$modules/links/types/link/linkType";
  import AirdropLanding from "$modules/useLink/components/airdrop/Landing.svelte";
  import TipLanding from "$modules/useLink/components/tiplink/Landing.svelte";
  import BasketLanding from "$modules/useLink/components/tokenbasket/Landing.svelte";
  import { type GenericUserLinkStoreVM } from "$modules/useLink/types/viewModels/genericUserLinkStoreVM";

  const {
    userLink,
    openLoginModal,
  }: {
    userLink: GenericUserLinkStoreVM;
    openLoginModal?: (payload?: {
      link_type: string;
      BE_link_id: string;
    }) => void;
  } = $props();

  const linkType = $derived.by(() => {
    return userLink.link?.link_type;
  });
</script>

<div
  class="mx-auto w-[400px] max-w-full p-5 rounded-[13px] bg-lightgreen relative flex flex-col items-center justify-center overflow-hidden"
>
  {#if linkType === LinkType.TIP}
    <TipLanding {userLink} {openLoginModal} />
  {/if}
  {#if linkType === LinkType.AIRDROP}
    <AirdropLanding {userLink} {openLoginModal} />
  {/if}
  {#if linkType === LinkType.TOKEN_BASKET}
    <BasketLanding {userLink} {openLoginModal} />
  {/if}

  <!-- TODO: Other link types will be added here -->
  <!-- 
  {#if linkType === LinkType.RECEIVE_PAYMENT}
    <PaymentLanding {userLink} {openLoginModal} />
  {/if} -->
</div>
