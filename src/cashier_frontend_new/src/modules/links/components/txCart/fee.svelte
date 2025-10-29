<script lang="ts">
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import type { FeeItem } from "./type";
  import { ChevronRight } from "lucide-svelte";
  let {
    fees,
    onOpen,
  }: {
    fees: FeeItem[];
    onOpen?: () => void;
  } = $props();

  // compute total USD value
  let totalUsd = $derived(() => {
    return fees.reduce((acc, fee) => acc + (fee.usdValue || 0), 0);
  });
</script>

<div class="mt-4">
  <h5 class="text-sm font-medium mb-2">Total fees</h5>

  <!-- Card -->
  <div
    class="p-3 rounded-lg flex items-center justify-between border border-green-100 bg-[rgba(236,253,245,0.8)] hover:shadow-sm cursor-pointer"
    role="button"
    aria-label="Total fees, open breakdown"
    onclick={() => onOpen && onOpen()}
    tabindex="0"
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen && onOpen();
      }
    }}
  >
    <!-- Left: stacked icons -->
    <div class="flex items-center">
      <div class="flex -space-x-2 items-center">
        {#each fees as fee, i}
          {#if i < 5}
            <!-- FeeItem doesn't include an icon field; render the token symbol as a badge -->
            <div
              class="w-8 h-8 rounded-md border bg-white flex items-center justify-center text-xs font-semibold shadow-sm"
            >
              {fee.symbol}
            </div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Right: amount + chevron -->
    <div class="flex items-center gap-3 text-gray-700">
      <span class="text-base font-medium"
        >{`~$${formatNumber(totalUsd(), {
          tofixed: 2,
        })}`}</span
      >
      <ChevronRight class="w-4 h-4" />
    </div>
  </div>
</div>
