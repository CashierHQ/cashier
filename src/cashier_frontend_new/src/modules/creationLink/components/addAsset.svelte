<script lang="ts">
  import { LinkType } from "$modules/links/types/link/linkType";
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import TipLinkAddAsset from "$modules/creationLink/components/tiplink/addAsset.svelte";
  import AirDropAddAsset from "$modules/creationLink/components/airdrop/addAsset.svelte";

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
  {/if}
  <!-- TODO: Other asset types will be added here -->
{/if}
