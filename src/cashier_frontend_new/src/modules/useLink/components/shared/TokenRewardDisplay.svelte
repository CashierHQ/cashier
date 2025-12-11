<script lang="ts">
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { formatNumber } from "$modules/shared/utils/formatNumber";

  const {
    tokenAddress,
    amount,
    symbol,
    decimals,
    message,
  }: {
    tokenAddress: string;
    amount: number;
    symbol: string;
    decimals: number;
    message: string;
  } = $props();

  const tokenLogo = $derived(getTokenLogo(tokenAddress));
  let imageError = $state(false);

  const firstLetter = $derived(symbol?.[0]?.toUpperCase() ?? "?");

  // Format amount with proper decimal places based on token decimals
  const formattedAmount = $derived(formatNumber(amount, { tofixed: decimals }));

  function handleImageError() {
    imageError = true;
  }
</script>

<div class="flex flex-col items-center">
  <!-- Token Image or Fallback -->
  {#if imageError}
    <span
      class="w-[220px] h-[220px] flex items-center justify-center bg-gray-300 rounded-full mt-[14%] mb-4 text-[84px] font-semibold text-gray-600"
    >
      {firstLetter}
    </span>
  {:else}
    <img
      src={tokenLogo}
      alt={symbol}
      class="w-[220px] h-[220px] object-contain mt-[14%] mb-4"
      onerror={handleImageError}
    />
  {/if}

  <!-- Amount and Symbol -->
  <div
    class="text-center mb-1.5 text-gray-900 text-[16px] font-semibold leading-[120%]"
  >
    {formattedAmount}
    {symbol}
  </div>

  <!-- Message -->
  <div
    class="text-center text-gray-600 text-[14px] font-normal leading-[120%] mb-8 max-w-[180px]"
  >
    {message}
  </div>
</div>
