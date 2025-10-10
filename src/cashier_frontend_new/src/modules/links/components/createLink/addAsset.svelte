<script lang="ts">
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { LinkType } from "../../types/linkType";
  import TipLinkAddAsset from "./tiplink/addAsset.svelte";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();
</script>

{#if link.linkType === LinkType.TIP}
  <TipLinkAddAsset {link} />
{/if}
