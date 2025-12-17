<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";
  import type { AssetBalance } from "$modules/detailLink/types/balanceTypes";

  type Props = {
    linkUseActionCounter: bigint;
    balances: AssetBalance[];
    balancesLoading: boolean;
  };

  let { linkUseActionCounter, balances, balancesLoading }: Props = $props();

  // Track failed image loads
  let failedImageLoads = $state<Set<string>>(new Set());

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Calculate total USD value from balances
  const totalUsdValue = $derived.by(() => {
    return balances.reduce((total, b) => total + b.usdValue, 0);
  });
</script>

<div>
  <div class="flex gap-2 items-center mb-2 justify-between">
    <Label>{locale.t("links.linkForm.detail.usageInfo")}</Label>
  </div>
  <div class="flex flex-col border-[1px] rounded-lg border-lightgreen">
    <div
      class="flex flex-row items-center justify-between border-lightgreen px-5 py-3"
    >
      <p class="font-medium text-sm">
        {locale.t("links.linkForm.detail.assetsInLink")}
      </p>
      <div class="flex flex-col items-end gap-2">
        {#if balancesLoading}
          <div class="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
        {:else if balances.length > 0}
          {#each balances as balance (balance.asset.address?.toString())}
            {@const address = balance.asset.address?.toString() ?? ""}
            <div class="flex items-center gap-2">
              <p class="text-sm">
                {balance.formattedBalance}
                {balance.symbol}
              </p>
              {#if balance.logo && !failedImageLoads.has(address)}
                <img
                  src={balance.logo}
                  alt={balance.symbol}
                  class="w-4 h-4 rounded-full"
                  onerror={() => handleImageError(address)}
                />
              {:else}
                <div
                  class="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs"
                >
                  {balance.symbol[0]?.toUpperCase() || "?"}
                </div>
              {/if}
            </div>
          {/each}
          {#if totalUsdValue > 0}
            <p class="text-sm text-gray-500">
              ~${formatUsdAmount(totalUsdValue)}
            </p>
          {/if}
        {:else}
          <p class="text-sm text-primary/80">-</p>
        {/if}
      </div>
    </div>
    <div
      class="flex flex-row items-center justify-between border-t border-lightgreen mx-5 py-3"
    >
      <p class="font-medium text-sm">
        {locale.t("links.linkForm.detail.used")}
      </p>
      <p class="text-sm">
        {linkUseActionCounter.toString()}
      </p>
    </div>
  </div>
</div>
