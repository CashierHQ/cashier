<script lang="ts">
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { formatTokenPrice } from "$modules/shared/utils/formatNumber";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";

  type Props = {
    token: TokenWithPriceAndBalance;
    selectedAddress?: string;
    onSelect: (address: string) => void;
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    isBalanceHidden?: boolean;
  };

  let {
    token,
    selectedAddress,
    onSelect,
    failedImageLoads,
    onImageError,
    isBalanceHidden = false,
  }: Props = $props();

  // Format token balance
  function formatBalance(balance: bigint, decimals: number): string {
    const parsedBalance = parseBalanceUnits(balance, decimals);
    return parsedBalance === 0 ? "0" : parsedBalance.toFixed(5);
  }

  // Format USD value
  function formatUSDValue(
    balance: bigint,
    decimals: number,
    priceUSD: number,
  ): string {
    const parsedBalance = parseBalanceUnits(balance, decimals);
    if (parsedBalance === 0 || !priceUSD || priceUSD === 0) {
      return "-";
    }
    const usdValue = parsedBalance * priceUSD;
    return `$${usdValue.toFixed(2)}`;
  }

  const tokenLogo = getTokenLogo(token.address);
  const formattedBalance = formatBalance(token.balance, token.decimals);
  const formattedUSD = formatUSDValue(
    token.balance,
    token.decimals,
    token.priceUSD,
  );

  function handleImageError() {
    onImageError(token.address);
  }
</script>

<li>
  <button
    type="button"
    class="w-full text-left p-2 rounded cursor-pointer hover:bg-gray-50"
    class:bg-gray-100={selectedAddress === token.address}
    onclick={() => onSelect(token.address)}
  >
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        {#if tokenLogo && !failedImageLoads.has(token.address)}
          <span
            class="relative flex shrink-0 overflow-hidden rounded-full w-9 h-9"
          >
            <div class="w-full h-full overflow-hidden rounded-full">
              <img
                alt={token.symbol}
                class="w-full h-full object-cover"
                src={tokenLogo}
                onerror={handleImageError}
              />
            </div>
          </span>
        {:else}
          <span
            class="relative flex shrink-0 overflow-hidden rounded-full w-9 h-9"
          >
            <div
              class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-xs"
            >
              {token.symbol[0]?.toUpperCase() || "?"}
            </div>
          </span>
        {/if}
        <div>
          <strong>{token.symbol}</strong>
          <div class="text-sm text-gray-500">
            {formatTokenPrice(token.priceUSD)}
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm text-gray-500 text-right">
          {isBalanceHidden ? "*****" : formattedBalance}
        </div>
        <div class="text-sm text-gray-500 text-right">
          {isBalanceHidden ? "*****" : formattedUSD}
        </div>
      </div>
    </div>
  </button>
</li>
