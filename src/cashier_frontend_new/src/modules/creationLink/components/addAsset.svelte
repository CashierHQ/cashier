<script lang="ts">
  import AirDropAddAsset from "$modules/creationLink/components/airdrop/addAsset.svelte";
  import AirDropSharedTestAddAsset from "$modules/creationLink/components/airdropSharedTest/addAsset.svelte";
  import TipLinkAddAsset from "$modules/creationLink/components/tiplink/addAsset.svelte";
  import TipSharedTestAddAsset from "$modules/creationLink/components/tipSharedTest/addAsset.svelte";
  import TokenBasketAddAsset from "$modules/creationLink/components/tokenbasket/addAsset.svelte";
  import TokenBasketSharedTestAddAsset from "$modules/creationLink/components/tokenbasketSharedTest/addAsset.svelte";
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { LinkType } from "$modules/links/types/link/linkType";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();
</script>

{#if link.createLinkData}
  {#if link.createLinkData.linkType === LinkType.TIP}
    <TipLinkAddAsset {link} />
  {:else if link.createLinkData.linkType === LinkType.AIRDROP}
    <AirDropAddAsset {link} />
  {:else if link.createLinkData.linkType === LinkType.TOKEN_BASKET}
    <TokenBasketAddAsset {link} />
  {:else if link.createLinkData.linkType === LinkType.TIP_SHARED_TEST}
    <TipSharedTestAddAsset {link} />
  {:else if link.createLinkData.linkType === LinkType.AIRDROP_SHARED_TEST}
    <AirDropSharedTestAddAsset {link} />
  {:else if link.createLinkData.linkType === LinkType.TOKEN_BASKET_SHARED_TEST}
    <TokenBasketSharedTestAddAsset {link} />
  {/if}
{/if}
