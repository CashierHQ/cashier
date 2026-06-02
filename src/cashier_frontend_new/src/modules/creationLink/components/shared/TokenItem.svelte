<script lang="ts">
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import {
    formatTokenPrice,
    formatUsdAmount,
  } from "$modules/shared/utils/formatNumber";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { getTokenLogo, TokenIcon } from "$modules/imageCache";

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
      return "$0.00";
    }
    const usdValue = parsedBalance * priceUSD;
    return `~$${formatUsdAmount(usdValue)}`;
  }

  const tokenLogo = token.runeInfo?.icon ?? getTokenLogo(token.address);
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
    class="w-full text-left px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50"
    class:bg-gray-100={selectedAddress === token.address}
    onclick={() => onSelect(token.address)}
  >
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-3">
        <TokenIcon
          address={token.address}
          symbol={token.symbol}
          logo={tokenLogo}
          size="lg"
          {failedImageLoads}
          onImageError={handleImageError}
        />
        <div>
          <p class="text-sm">{token.symbol}</p>
          <div class="text-[10px] font-light text-gray-400">
            {formatTokenPrice(token.priceUSD)}
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm text-gray-900 text-right">
          {isBalanceHidden ? "*****" : formattedBalance}
        </div>
        <div class="text-[10px] font-light text-gray-400 text-right">
          {isBalanceHidden ? "*****" : formattedUSD}
        </div>
      </div>
    </div>
  </button>
</li>
