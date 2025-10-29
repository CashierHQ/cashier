<script lang="ts">
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { LinkType } from "../../types/link/linkType";
  import TipLinkAddAsset from "./tiplink/addAsset.svelte";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();
</script>

{#if link.createLinkData}
  {#if link.createLinkData.linkType === LinkType.TIP}
  <TipLinkAddAsset {link} />
  {/if}
{/if}
