<script lang="ts">
  import type { LinkDetailStore } from "$modules/links/state/linkDetailStore.svelte";
  import type UserLinkStore from "$modules/userLink/state/userLinkStore.svelte";
  import AssetList from "../AssetList.svelte";
  import Header from "../Header.svelte";

  const {
    userLink,
    linkDetail,
  }: { userLink: UserLinkStore; linkDetail?: LinkDetailStore } = $props();
</script>

{#if linkDetail?.query.isLoading}
  Loading...
{/if}

<div class="p-4 border rounded">
  {#if linkDetail?.link}
    <Header title={linkDetail.link.title} />
    <AssetList assetInfo={linkDetail.link.asset_info} />
  {/if}

  <h2 class="text-lg font-semibold">Landing</h2>
  <p class="text-sm text-gray-600">
    Welcome — choose to continue to unlock or to the locked flow.
  </p>

  <div class="mt-4 flex gap-2">
    <button
      class="px-3 py-1 bg-gray-200 rounded"
      onclick={() => userLink.goBack()}
    >
      Back
    </button>

    <button
      class="px-3 py-1 bg-blue-600 text-white rounded"
      onclick={() => userLink.goNext()}
    >
      Next
    </button>
  </div>
</div>
