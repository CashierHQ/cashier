<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import { formatNumber } from "$modules/shared/utils/formatNumber";

  type AssetWithTokenInfo = {
    address: string;
    amount: number;
    token: {
      symbol: string;
      decimals: number;
      priceUSD?: number;
    };
    usdValue: number;
    logo: string;
  };

  type Props = {
    linkTypeText: string;
    assetsWithTokenInfo: AssetWithTokenInfo[];
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    isPaymentLink: boolean;
    isSendLink: boolean;
    maxUse: number;
  };

  let {
    linkTypeText,
    assetsWithTokenInfo,
    failedImageLoads,
    onImageError,
    isPaymentLink,
    isSendLink,
    maxUse,
  }: Props = $props();
</script>

<div>
  <div class="flex gap-2 items-center mb-2 justify-between">
    <Label>{locale.t("links.linkForm.preview.linkInfo")}</Label>
  </div>
  <div class="flex flex-col border-[1px] rounded-lg border-lightgreen">
    <div
      class="flex flex-row items-center justify-between border-lightgreen px-5 py-3"
    >
      <p class="font-medium text-sm">
        {locale.t("links.linkForm.preview.type")}
      </p>
      <p class="text-sm">{linkTypeText}</p>
    </div>
    <div
      class="flex flex-row items-center justify-between border-lightgreen px-5 py-3"
    >
      <p class="font-medium text-sm">
        {locale.t("links.linkForm.preview.userPays")}
      </p>
      <div class="flex flex-col items-end gap-2">
        {#if isPaymentLink}
          {#each assetsWithTokenInfo as asset (asset.address)}
            <div class="flex items-center gap-2">
              <p class="text-sm">
                {formatNumber(asset.amount)}
                {asset.token.symbol}
              </p>
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
        {:else}
          <p class="text-sm">-</p>
        {/if}
      </div>
    </div>
    <div
      class="flex flex-row items-center justify-between border-lightgreen px-5 py-3"
    >
      <p class="font-medium text-sm">
        {locale.t("links.linkForm.preview.userClaims")}
      </p>
      <div class="flex flex-col items-end gap-2">
        {#if isSendLink}
          {#each assetsWithTokenInfo as asset (asset.address)}
            <div class="flex items-center gap-2">
              <p class="text-sm">
                {formatNumber(asset.amount)}
                {asset.token.symbol}
              </p>
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
        {:else}
          <p class="text-sm text-primary/80">-</p>
        {/if}
      </div>
    </div>
    <div class="flex flex-row items-center justify-between px-5 py-3">
      <p class="font-medium text-sm">
        {locale.t("links.linkForm.preview.maxUse")}
      </p>
      <p class="text-sm">
        {maxUse ? maxUse.toString() : "1"}
      </p>
    </div>
  </div>
</div>
