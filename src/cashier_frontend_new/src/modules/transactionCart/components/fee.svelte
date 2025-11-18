<script lang="ts">
    import { formatNumber } from "$modules/shared/utils/formatNumber";
    import { ChevronRight } from "lucide-svelte";
    import type { AssetAndFee } from '../services/feeService';
  let {
    assetAndFeeList,
    onOpen,
  }: {
    assetAndFeeList: AssetAndFee[];
    onOpen?: () => void;
  } = $props();

  // compute total USD value
  let totalUsd = $derived(() => {
    return assetAndFeeList.reduce((acc, item) => acc + (item.fee?.usdValue || 0), 0);
  });
</script>

<div class="mt-4 w-full">
  <h5 class="text-sm font-medium mb-2">Total fees</h5>

  <!-- Card -->
  <button
    class="p-3 w-full rounded-lg flex items-center justify-between border border-green-100 hover:shadow-sm cursor-pointer"
    aria-label="Total fees, open breakdown"
    onclick={() => onOpen && onOpen()}
    tabindex="0"
  >
    <!-- Left: stacked icons -->
    <div class="flex items-center">
      <div class="flex -space-x-2 items-center">
        {#each assetAndFeeList as item, i (i)}
          {#if i < 5}
            <!-- FeeItem doesn't include an icon field; render the token symbol as a badge -->
            <div
              class="w-8 h-8 rounded-md border bg-white flex items-center justify-center text-xs font-semibold shadow-sm"
            >
              {item.fee?.symbol}
            </div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Right: amount + chevron -->
    <div class="flex items-center gap-3 text-gray-700">
      <span class="text-base font-medium"
        >{`~$${formatNumber(totalUsd())}`}</span
      >
      <ChevronRight class="w-4 h-4" />
    </div>
  </button>
</div>
