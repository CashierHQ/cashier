<script lang="ts">
  import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import Actions from "./Actions.svelte";
  import AssetList from "./AssetList.svelte";

  const {
    linkDetail,
    onCreateUseAction,
    isCreatingAction = false,
    hasAction = false,
  }: {
    linkDetail: LinkDetailStore;
    onCreateUseAction?: () => Promise<void>;
    isCreatingAction?: boolean;
    hasAction?: boolean;
  } = $props();
</script>

{#if linkDetail?.link}
  <div class="w-full grow-1 flex flex-col justify-between">
    <AssetList assetInfo={linkDetail.link.asset_info} />

    <Actions
      link={linkDetail.link}
      {onCreateUseAction}
      disabled={isCreatingAction && !hasAction}
    />
  </div>
{/if}
