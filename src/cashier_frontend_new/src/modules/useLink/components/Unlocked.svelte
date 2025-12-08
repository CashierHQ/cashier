<script lang="ts">
  import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import Actions from "./Actions.svelte";
  import AssetList from "./AssetList.svelte";

  const {
    linkDetail,
    onCreateUseAction,
  }: {
    linkDetail: LinkDetailStore;
    onCreateUseAction?: () => Promise<void>;
  } = $props();
</script>

{#if linkDetail?.query.isLoading}
  Loading...
{/if}

{#if linkDetail?.link}
  <div class="w-full grow-1 flex flex-col justify-between">
    <AssetList assetInfo={linkDetail.link.asset_info} />

    <Actions link={linkDetail.link} {onCreateUseAction} />
  </div>
{/if}
