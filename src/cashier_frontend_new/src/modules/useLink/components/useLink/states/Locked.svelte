<script lang="ts">
  import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import type UserLinkStore from "$modules/useLink/state/userLinkStore.svelte";
  import AssetList from "../AssetList.svelte";
  import Header from "../Header.svelte";
  import LockedActions from "../LockedActions.svelte";

  const {
    userLink,
    linkDetail,
  }: { userLink: UserLinkStore; linkDetail?: LinkDetailStore } = $props();

  console.log("Locked.svelte userLink:", userLink);
</script>

{#if linkDetail?.query.isLoading}
  Loading...
{/if}

{#if linkDetail?.link}
  <div class="p-4 border rounded">
    <Header title={linkDetail.link.title} />

    <AssetList assetInfo={linkDetail.link.asset_info} />

    <LockedActions link={linkDetail.link} onUnlock={() => userLink.goNext()} />

    <div class="mt-4 flex gap-2">
      <button
        class="px-3 py-1 bg-gray-200 rounded"
        onclick={() => userLink.goBack()}>Back</button
      >
    </div>
  </div>
{/if}
