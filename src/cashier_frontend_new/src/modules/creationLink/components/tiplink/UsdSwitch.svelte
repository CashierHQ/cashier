<script lang="ts">
  import { Repeat2 } from "lucide-svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import { locale } from "$lib/i18n";

  type Props = {
    token: TokenWithPriceAndBalance;
    amount?: number | null;
    symbol?: string;
    isUsd: boolean;
    canConvert?: boolean;
    onToggle: (isUsd: boolean) => void;
    usdDecimals?: number;
  };

  let {
    token,
    isUsd,
    onToggle,
    amount = 0,
    symbol = "",
    canConvert = false,
    usdDecimals = 2,
  }: Props = $props();

  // Calculate USD value from token amount
  const usdValue = $derived.by(() => {
    if (!amount || !token.priceUSD) return 0;
    const calculated = amount * token.priceUSD;
    // Round to 4 decimal places to avoid floating point precision errors
    // This ensures consistent conversion back and forth
    return Math.round(calculated * 10000) / 10000;
  });

  // Format value to display
  const valueToDisplay = $derived.by(() => {
    if (!canConvert) {
      return "~$0";
    }

    if (isUsd) {
      return `${formatNumber(amount || 0)} ${symbol}`;
    }

    if (usdValue === 0) {
      return "~$0";
    }

    return `~$${formatNumber(usdValue, { tofixed: usdDecimals })}`;
  });
</script>

{#if !canConvert}
  <span class="text-[10px] font-light text-grey-400">
    {locale.t("links.linkForm.addAsset.noPriceAvailable")}
  </span>
{:else}
  <button
    type="button"
    class="flex items-center text-grey-400"
    onclick={() => onToggle(!isUsd)}
    aria-label={isUsd
      ? locale.t("links.linkForm.addAsset.switchToTokenAmount")
      : locale.t("links.linkForm.addAsset.switchToUsdAmount")}
  >
    <span class="text-[10px] font-light">{valueToDisplay}</span>
    <Repeat2
      class="ml-1 text-destructive text-primary cursor-pointer"
      size={15}
      stroke-width={2}
    />
  </button>
{/if}
