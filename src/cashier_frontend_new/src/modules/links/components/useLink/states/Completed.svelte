<script lang="ts">
  import Header from "$modules/links/components/useLink/Header.svelte";
  import AssetList from "$modules/links/components/useLink/AssetList.svelte";
  import type { LinkDetailStore } from "$modules/links/state/linkDetailStore.svelte";

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
