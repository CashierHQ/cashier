<script lang="ts">
  import { LinkType } from "$modules/links/types/link/linkType";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import TipLinkAddAsset from "./tiplink/addAsset.svelte";
  import AirDropAddAsset from "./airdrop/addAsset.svelte";

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
