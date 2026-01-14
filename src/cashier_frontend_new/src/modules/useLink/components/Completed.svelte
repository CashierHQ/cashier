<script lang="ts">
  import { LinkType } from "$modules/links/types/link/linkType";
  import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import TipCompleted from "$modules/useLink/components/tiplink/Completed.svelte";
  import AirdropCompleted from "$modules/useLink/components/airdrop/Completed.svelte";

  const { linkDetail }: { linkDetail?: LinkDetailStore } = $props();

  const linkType = $derived.by(() => {
    return linkDetail?.link?.link_type;
  });
</script>

<div
  class="mx-auto w-[400px] max-w-full p-5 rounded-[13px] bg-lightgreen relative flex flex-col items-center justify-center overflow-hidden my-3"
>
  {#if linkType === LinkType.TIP}
    <TipCompleted {linkDetail} />
  {/if}
  {#if linkType === LinkType.AIRDROP}
    <AirdropCompleted {linkDetail} />
  {/if}
  <!-- TODO: Other link types will be added here -->
  <!-- 
  {#if linkType === LinkType.TOKEN_BASKET}
    <BasketCompleted {linkDetail} />
  {/if}
  {#if linkType === LinkType.RECEIVE_PAYMENT}
    <PaymentCompleted {linkDetail} />
  {/if} -->
</div>
