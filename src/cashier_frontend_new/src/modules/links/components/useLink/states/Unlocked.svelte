<script lang="ts">
  import type UserLinkStore from "$modules/links/state/userLinkStore.svelte";
  import Header from "$modules/links/components/useLink/Header.svelte";
  import AssetList from "$modules/links/components/useLink/AssetList.svelte";
  import Actions from "$modules/links/components/useLink/Actions.svelte";
  import type { LinkDetailStore } from "$modules/links/state/linkDetailStore.svelte";

  // Props: userLink, linkDetail, and handler passed from parent
  const {
    userLink,
    linkDetail,
    onCreateUseAction,
  }: {
    userLink: UserLinkStore;
    linkDetail: LinkDetailStore;
    onCreateUseAction?: () => Promise<void>;
  } = $props();
</script>

{#if linkDetail?.query.isLoading}
  Loading...
{/if}

{#if linkDetail?.link}
  <div class="p-4 border rounded">
    <Header title={linkDetail.link.title} />

    <AssetList assetInfo={linkDetail.link.asset_info} />

    <Actions link={linkDetail.link} {onCreateUseAction} />

    <div class="mt-4 flex gap-2">
      <button
        class="px-3 py-1 bg-gray-200 rounded"
        onclick={() => userLink.goBack()}>Back</button
      >
    </div>
  </div>
{/if}
