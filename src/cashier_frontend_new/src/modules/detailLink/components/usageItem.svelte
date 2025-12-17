<script lang="ts">
  import type { AssetBalance } from "$modules/detailLink/types/balanceTypes";

  type Props = {
    balance: AssetBalance;
  };

  let { balance }: Props = $props();

  let imageLoadFailed = $state(false);

  function handleImageError() {
    imageLoadFailed = true;
  }
</script>

<div class="flex items-center gap-2">
  <p class="text-sm">
    {balance.formattedBalance}
    {balance.symbol}
  </p>
  {#if balance.logo && !imageLoadFailed}
    <img
      src={balance.logo}
      alt={balance.symbol}
      class="w-4 h-4 rounded-full"
      onerror={handleImageError}
    />
  {:else}
    <div
      class="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs"
    >
      {balance.symbol[0]?.toUpperCase() || "?"}
    </div>
  {/if}
</div>
