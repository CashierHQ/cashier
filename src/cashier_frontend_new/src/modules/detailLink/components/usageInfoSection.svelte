<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import {
    formatNumber,
    formatUsdAmount,
  } from "$modules/shared/utils/formatNumber";
  import type { AssetWithTokenInfo } from "$modules/links/utils/feesBreakdown";
  import type { Link } from "$modules/links/types/link/link";
  import { TokenIcon } from "$modules/imageCache";

  type Props = {
    assetsWithTokenInfo: AssetWithTokenInfo[];
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    link?: Link;
  };

  let { assetsWithTokenInfo, failedImageLoads, onImageError, link }: Props =
    $props();

  const linkUseActionCounter = $derived(link?.link_use_action_counter ?? 0n);

  const maxUse = $derived(link ? Number(link.link_use_action_max_count) : 1);

  // Calculate remaining uses
  const remainingUses: number = $derived(
    Math.max(0, (maxUse || 1) - Number(linkUseActionCounter)),
  );
</script>

<div>
  <div class="flex gap-2 items-center mb-2 justify-between">
    <Label>{locale.t("links.linkForm.detail.usageInfo")}</Label>
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
                  {formatNumber(asset.amount * remainingUses)}
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
                  ~${formatUsdAmount(asset.usdValue * remainingUses)}
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
