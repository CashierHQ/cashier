<script lang="ts">
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import AirDropAddAsset from "$modules/creationLink/components/airdrop/addAsset.svelte";
  import TipLinkAddAsset from "$modules/creationLink/components/tiplink/addAsset.svelte";
  import TokenBasketAddAsset from "$modules/creationLink/components/tokenbasket/addAsset.svelte";
  import type { AddAssetVM } from "$modules/creationLink/types/viewModels/addAssetVM";
  import type { GenericCreationLinkStoreVM } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
  import { LinkType } from "$modules/links/types/link/linkType";
  import { onMount } from "svelte";

  const {
    link,
  }: {
    link: GenericCreationLinkStoreVM & AddAssetVM;
  } = $props();

  onMount(() => {
    trackEvent(AnalyticsEvent.LINK_CREATION_ASSET_LANDING, {
      link_type: link.createLinkData.linkType,
      FE_link_id: link.id ?? "",
    });
  });
</script>

{#if link.linkType === LinkType.TIP}
  <TipLinkAddAsset {link} />
{:else if link.linkType === LinkType.AIRDROP}
  <AirDropAddAsset {link} />
{:else if link.linkType === LinkType.TOKEN_BASKET}
  <TokenBasketAddAsset {link} />
{/if}
