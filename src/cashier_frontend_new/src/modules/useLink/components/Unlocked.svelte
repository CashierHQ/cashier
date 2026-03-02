<script lang="ts">
  import type { Link } from "$modules/links/types/link/link";
  import Actions from "./Actions.svelte";
  import AssetList from "./AssetList.svelte";

  const {
    link,
    onCreateUseAction,
    isCreatingAction = false,
    hasAction = false,
  }: {
    link: Link;
    onCreateUseAction?: () => Promise<void>;
    isCreatingAction?: boolean;
    hasAction?: boolean;
  } = $props();
</script>

{#if link}
  <div class="w-full grow-1 flex flex-col justify-between">
    <AssetList assetInfo={link.asset_info} />

    <Actions
      {link}
      {onCreateUseAction}
      disabled={isCreatingAction && !hasAction}
    />
  </div>
{/if}
