<script lang="ts">
  import AssetItem from "./AssetItem.svelte";
  import type { AssetInfo } from "../../types/link/asset";

  interface Props {
    assetInfo: AssetInfo[];
  }

  let { assetInfo }: Props = $props();
</script>

{#if assetInfo && assetInfo.length > 0}
  <div class="space-y-3 mb-4">
    {#each assetInfo as assetInfoItem (assetInfoItem.asset.address?.toText?.() ?? assetInfoItem.label)}
      <AssetItem assetInfo={assetInfoItem} />
    {/each}
  </div>
{:else}
  <div class="text-sm text-muted-foreground mb-4">No assets</div>
{/if}
