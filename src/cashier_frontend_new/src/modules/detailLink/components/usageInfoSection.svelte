<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";
  import type { AssetWithTokenInfo } from "$modules/links/utils/feesBreakdown";
  import type { AssetBalance } from "$modules/detailLink/types/balanceTypes";

  type Props = {
    assetsWithTokenInfo: AssetWithTokenInfo[];
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    linkUseActionCounter: bigint;
    balances: AssetBalance[];
    balancesLoading: boolean;
  };

  let {
    assetsWithTokenInfo,
    failedImageLoads,
    onImageError,
    linkUseActionCounter,
    balances,
    balancesLoading,
  }: Props = $props();

  // Create balance map for efficient O(1) lookup by address
  const balanceMap = $derived.by(() => {
    const map = new Map<string, string>();
    for (const b of balances) {
      if (b.asset.address) {
        map.set(b.asset.address.toString(), b.formattedBalance);
      }
    }
    return map;
  });

  // Get formatted balance for an asset
  function getFormattedBalance(address: string): string {
    return balanceMap.get(address) ?? "-";
  }

  // Calculate total USD value of all assets
  const totalUsdValue = $derived.by(() => {
    return assetsWithTokenInfo.reduce(
      (total, asset) => total + asset.usdValue,
      0,
    );
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
        {#if assetsWithTokenInfo.length > 0}
          {#each assetsWithTokenInfo as asset (asset.address)}
            <div class="flex items-center gap-2">
              {#if balancesLoading}
                <div class="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              {:else}
                <p class="text-sm">
                  {getFormattedBalance(asset.address)}
                  {asset.token.symbol}
                </p>
              {/if}
              {#if !failedImageLoads.has(asset.address)}
                <img
                  src={asset.logo}
                  alt={asset.token.symbol}
                  class="w-4 h-4 rounded-full"
                  onerror={() => onImageError(asset.address)}
                />
              {:else}
                <div
                  class="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs"
                >
                  {asset.token.symbol[0]?.toUpperCase() || "?"}
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
