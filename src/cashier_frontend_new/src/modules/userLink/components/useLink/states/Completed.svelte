<script lang="ts">
    import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import AssetList from "../AssetList.svelte";
  import Header from "../Header.svelte";

  const { linkDetail }: { linkDetail?: LinkDetailStore } = $props();
</script>

{#if linkDetail?.query.isLoading}
  Loading...
{/if}

<div class="p-4 border rounded">
  {#if linkDetail?.link}
    <Header title={linkDetail.link.title} />
    <AssetList assetInfo={linkDetail.link.asset_info} />
  {/if}

  <h2 class="text-lg font-semibold">Completed</h2>
  <p class="text-sm text-gray-600">Flow completed — thank you.</p>
</div>
