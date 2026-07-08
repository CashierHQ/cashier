<script lang="ts">
  import { getTokenLogo } from "$modules/imageCache";
  import { formatNumber } from "$modules/shared/utils/formatNumber";

  const {
    tokenAddress,
    amount,
    symbol,
    decimals,
    message,
    logo,
    claimedCount,
    totalCount,
  }: {
    tokenAddress: string;
    amount: number;
    symbol: string;
    decimals: number;
    message: string;
    logo?: string;
    claimedCount?: number;
    totalCount?: number;
  } = $props();

  const tokenLogo = $derived(logo ?? getTokenLogo(tokenAddress, true));
  let imageError = $state(false);

  const firstLetter = $derived(symbol?.[0]?.toUpperCase() ?? "?");

  // Format amount with proper decimal places based on token decimals
  const formattedAmount = $derived(formatNumber(amount, { tofixed: decimals }));

  function handleImageError() {
    imageError = true;
  }
</script>

<div
  class="flex flex-col items-center {claimedCount !== undefined &&
  totalCount !== undefined
    ? '-mx-5 -mt-5 w-[calc(100%+2.5rem)]'
    : 'w-full'}"
>
  {#if claimedCount !== undefined && totalCount !== undefined}
    <div class="w-full rounded-t-[13px] bg-primary px-4 py-3 text-center">
      <div class="text-[18px] font-semibold leading-[120%] text-white">
        {claimedCount}/{totalCount} claimed
      </div>
    </div>
  {/if}

  {#if imageError}
    <span
      class="mt-8 mb-4 flex h-[220px] w-[220px] items-center justify-center rounded-full bg-gray-300 text-[84px] font-semibold text-gray-600"
    >
      {firstLetter}
    </span>
  {:else}
    <img
      src={tokenLogo}
      alt={symbol}
      class="mt-8 mb-4 h-[220px] w-[220px] object-contain"
      onerror={handleImageError}
    />
  {/if}

  <div
    class="text-center mb-1.5 text-gray-900 text-[16px] font-semibold leading-[120%]"
  >
    {formattedAmount}
    {symbol}
  </div>

  <div
    class="text-center text-gray-600 text-[14px] font-normal leading-[120%] mb-8 max-w-[180px]"
  >
    {message}
  </div>
</div>
