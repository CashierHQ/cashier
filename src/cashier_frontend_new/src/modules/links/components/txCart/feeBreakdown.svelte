<script lang="ts">
  import { assertUnreachable } from "$lib/rsMatch";
  import { FeeType, type FeeItem } from "$modules/fee/type";
  import { formatNumber } from "$modules/shared/utils/formatNumber";

  let {
    fees,
    onBack,
  }: {
    fees: FeeItem[];
    onBack: () => void;
  } = $props();

  // total in USD (derived)
  let totalUsd = $derived(() => {
    return fees.reduce((acc, f) => acc + (f.usdValue || 0), 0);
  });

  // total token amount (derived)
  let totalAmount = $derived(() => {
    return fees.reduce((acc, f) => acc + (parseFloat(f.amount) || 0), 0);
  });

  // primary symbol (first fee's symbol) — empty if none
  let primarySymbol = $derived(() => {
    return fees[0] ? fees[0].symbol : "";
  });

  function labelForFee(f: FeeItem) {
    switch (f.feeType) {
      case FeeType.NETWORK_FEE:
        return "Network Fee";
      case FeeType.CREATE_LINK_FEE:
        return "Create Link Fee";
      default:
        assertUnreachable(f.feeType as never);
    }
  }

  // compute whether multiple tokens are present
  let uniqueSymbols = $derived(() => {
    const s = new Set(fees.map((f) => f.symbol));
    return s.size;
  });
</script>

<div class="mt-4">
  <!-- Header with back and centered title -->
  <div class="flex items-center mb-4 relative">
    <button
      class="inline-flex items-center justify-center rounded-full w-8 h-8 border bg-white"
      aria-label="Back"
      onclick={() => onBack && onBack()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <h2 class="text-lg font-semibold mx-auto">Total fees breakdown</h2>
  </div>

  <!-- Fees list card -->
  <div class="p-4 rounded-lg border border-green-100 bg-white mb-4">
    {#each fees as fee, i (i)}
      <div
        class="flex items-center justify-between py-3 border-b last:border-b-0"
      >
        <div class="text-sm">{labelForFee(fee)}</div>
        <div class="text-right">
          <div class="text-sm font-medium">{fee.amount} {fee.symbol}</div>
          {#if fee.usdValue !== undefined}
            <div class="text-xs text-muted-foreground">${fee.usdValueStr}</div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Total card -->
  <div
    class="p-4 rounded-lg border border-green-100 bg-white mb-6 flex items-center justify-between"
  >
    <div class="text-sm font-medium">Total fees</div>
    <div class="text-right">
      {#if uniqueSymbols() > 1}
        <div class="text-sm">Multiple tokens</div>
      {:else if fees[0]}
        <div class="text-sm">
          {formatNumber(totalAmount())}
          {primarySymbol()}
        </div>
      {/if}
      <div class="text-xs text-muted-foreground">
        {`~$${formatNumber(totalUsd())}`}
      </div>
    </div>
  </div>
</div>
