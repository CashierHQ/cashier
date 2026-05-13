<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { TokenIcon } from "$modules/imageCache";
  import type { AssetWithTokenInfo } from "$modules/links/utils/feesBreakdown";
  import {
    formatNumber,
    formatUsdAmount,
  } from "$modules/shared/utils/formatNumber";
  import { RefreshCw } from "lucide-svelte";

  type Props = {
    assetsWithTokenInfo: AssetWithTokenInfo[];
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    useCount?: number;
    onRefresh?: () => Promise<void>;
    isRefreshing?: boolean;
  };

  let {
    assetsWithTokenInfo,
    failedImageLoads,
    onImageError,
    useCount,
    onRefresh,
    isRefreshing = false,
  }: Props = $props();

  const linkUseActionCounter = $derived(useCount ?? 0);
</script>

<div>
  <div class="flex gap-2 items-center mb-2 justify-between">
    <Label>{locale.t("links.linkForm.detail.usageInfo")}</Label>
    {#if onRefresh}
      <div class="flex items-center rounded-[3px] border border-lightgreen">
        <button
          onclick={onRefresh}
          disabled={isRefreshing}
          class="text-[#36A18B] transition-colors hover:text-[#2d8a75] disabled:opacity-50 p-[3px] cursor-pointer"
        >
          <RefreshCw size={14} class={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>
    {/if}
  </div>
  <div class="flex flex-col border-[1px] rounded-lg border-lightgreen">
    <div
      class="flex flex-row items-start justify-between border-lightgreen px-5 py-3"
    >
      <p class="font-medium text-sm">
        {locale.t("links.linkForm.detail.assetsInLink")}
      </p>
      <div class="flex flex-col items-end gap-2">
        {#if assetsWithTokenInfo.length > 0}
          {#each assetsWithTokenInfo as asset (asset.address)}
            <div class="flex flex-col items-end gap-1">
              <div class="flex items-center gap-2">
                <p class="text-sm">
                  {formatNumber(asset.amount)}
                  {asset.token.symbol}
                </p>
                <TokenIcon
                  address={asset.address}
                  symbol={asset.token.symbol}
                  logo={asset.logo}
                  size="xs"
                  {failedImageLoads}
                  {onImageError}
                />
              </div>
              {#if asset.usdValue > 0}
                <p class="text-xs text-gray-500">
                  ~${formatUsdAmount(asset.usdValue)}
                </p>
              {/if}
            </div>
          {/each}
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
