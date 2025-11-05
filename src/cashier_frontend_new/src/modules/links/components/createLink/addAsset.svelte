<script lang="ts">
  import type { LinkCreationStore } from "../../state/linkStore.svelte";
  import { LinkType } from "../../types/link/linkType";
  import TipLinkAddAsset from "./tiplink/addAsset.svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();
</script>

{#if link.createLinkData}
  {#if link.createLinkData.linkType === LinkType.TIP}
    <TipLinkAddAsset {link} />
  {/if}
{/if}
