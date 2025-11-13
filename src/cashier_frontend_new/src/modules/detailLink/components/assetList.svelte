<script lang="ts">
  import AssetItem from "./assetItem.svelte";
  import type { AssetInfo } from "../../links/types/link/asset";

  interface Props {
    assetInfo: AssetInfo[];
    emptyMessage?: string;
  }

  let { assetInfo, emptyMessage = "-" }: Props = $props();
</script>

<div class="font-medium">
  {#if assetInfo && assetInfo.length > 0}
    <div class="flex gap-2 flex-wrap">
      {#each assetInfo as asset (asset.label + String(asset.amount_per_link_use_action))}
        <AssetItem assetInfo={asset} />
      {/each}
    </div>
  {:else}
    {emptyMessage}
  {/if}
</div>
