<script lang="ts">
  import AirDropAddAsset from "$modules/creationLink/components/airdrop/addAsset.svelte";
  import TipLinkAddAsset from "$modules/creationLink/components/tiplink/addAsset.svelte";
  import TokenBasketAddAsset from "$modules/creationLink/components/tokenbasket/addAsset.svelte";
  import type { AddAssetVM } from "$modules/creationLink/types/viewModels/addAssetVM";
  import type { GenericCreationLinkStoreVM } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
  import { LinkType } from "$modules/links/types/link/linkType";

  const {
    link,
  }: {
    link: GenericCreationLinkStoreVM & AddAssetVM;
  } = $props();
</script>

{#if link.linkType === LinkType.TIP}
  <TipLinkAddAsset {link} />
{:else if link.linkType === LinkType.AIRDROP}
  <AirDropAddAsset {link} />
{:else if link.linkType === LinkType.TOKEN_BASKET}
  <TokenBasketAddAsset {link} />
{/if}
