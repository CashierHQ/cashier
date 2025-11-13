<script lang="ts">
  import type { AssetItem as AssetItemType } from "$modules/transactionCart/types/txCart";
  import AssetItem from "./assetItem.svelte";

  const {
    title,
    assetItems,
  }: {
    title: string;
    assetItems: AssetItemType[];
  } = $props();
</script>

<div>
  <h5 class="text-sm font-medium mb-2">{title}</h5>
  <div class="space-y-3">
    {#each assetItems as asset, i (i)}
      <AssetItem {asset} />
    {/each}
  </div>
</div>
