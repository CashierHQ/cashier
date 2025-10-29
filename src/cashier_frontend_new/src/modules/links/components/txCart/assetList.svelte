<script lang="ts">
  import type { AssetItem as AssetItemType } from "./type";
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
    {#each assetItems as asset (asset.id)}
      <AssetItem {asset} />
    {/each}
  </div>
</div>
