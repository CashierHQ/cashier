<script lang="ts">
    import type { AssetAndFee } from '../services/feeService';
    import AssetItem from "./assetItem.svelte";

  const {
    title,
    assetAndFeeList,
  }: {
    title: string;
    assetAndFeeList: AssetAndFee[];
  } = $props();
</script>

<div>
  <h5 class="text-sm font-medium mb-2">{title}</h5>
  <div class="space-y-3">
    {#each assetAndFeeList as item}
      <AssetItem asset={item.asset} />
    {/each}
  </div>
</div>
