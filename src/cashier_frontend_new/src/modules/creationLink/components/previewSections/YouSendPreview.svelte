<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { Info } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import {
    formatUsdAmount,
    formatNumber,
  } from "$modules/shared/utils/formatNumber";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import AssetTransferInfoDrawer from "../drawers/AssetTransferInfoDrawer.svelte";
  import { FeeType } from "$modules/links/types/fee";
  import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";
  import { LinkType } from "$modules/links/types/link/linkType";
  import { SvelteMap } from "svelte/reactivity";

  type Props = {
    forecastAssetAndFee: Array<ForecastAssetAndFee>;
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    isReceive?: boolean;
    isClickable?: boolean;
    onInfoClick?: () => void;
    maxUse?: number;
    linkType?: string;
  };

  let {
    forecastAssetAndFee: forecastAssetAndFee,
    failedImageLoads,
    onImageError,
    isReceive = false,
    isClickable = false,
    onInfoClick,
    maxUse = 1,
    linkType,
  }: Props = $props();

  let assetTransferInfoDrawerOpen = $state(false);

  function handleInfoClick() {
    if (onInfoClick) {
      onInfoClick();
    } else {
      assetTransferInfoDrawerOpen = true;
    }
  }

  const assetsToDisplay = $derived.by(() => {
    return (forecastAssetAndFee || []).filter(
      (item) => item.fee?.feeType !== FeeType.CREATE_LINK_FEE,
    );
  });

  const linkCreationFeeItem = $derived.by(() => {
    return (forecastAssetAndFee || []).find(
      (item) => item.fee?.feeType === FeeType.CREATE_LINK_FEE,
    );
  });

  // Calculate display amount for each asset (multiply by maxUse for airdrop)
  const displayAmounts = $derived.by(() => {
    const amounts = new SvelteMap<string, string>();
    const usdAmounts = new SvelteMap<string, string>();

    for (const { asset } of assetsToDisplay) {
      if (linkType === LinkType.AIRDROP && maxUse > 1) {
        // Parse the formatted amount, multiply by maxUse, and format again
        const amountStr = asset.amount.replace(/[^\d.-]/g, "");
        const amountNum = parseFloat(amountStr);
        if (!isNaN(amountNum)) {
          const totalAmount = amountNum * maxUse;
          amounts.set(asset.address, formatNumber(totalAmount));
        } else {
          amounts.set(asset.address, asset.amount);
        }

        // Also multiply USD value by maxUse
        if (asset.usdValueStr) {
          const usdStr = asset.usdValueStr.replace(/[^\d.-]/g, "");
          const usdNum = parseFloat(usdStr);
          if (!isNaN(usdNum)) {
            const totalUsd = usdNum * maxUse;
            usdAmounts.set(asset.address, totalUsd.toString());
          } else {
            usdAmounts.set(asset.address, asset.usdValueStr);
          }
        }
      } else {
        amounts.set(asset.address, asset.amount);
        if (asset.usdValueStr) {
          usdAmounts.set(asset.address, asset.usdValueStr);
        }
      }
    }

    return { amounts, usdAmounts };
  });
</script>

<div class="input-label-field-container">
  <div class="flex items-center w-full justify-between mb-2">
    <div class="flex items-center gap-1">
      <Label class="font-medium text-sm">
        {isReceive
          ? locale.t("links.linkForm.preview.youReceive")
          : locale.t("links.linkForm.preview.youSend")}
      </Label>
      {#if !isReceive}
        <span class="text-[#b6b6b6] text-[10px] medium-font">
          {locale.t("links.linkForm.preview.includingNetworkFees")}
        </span>
      {/if}
    </div>
    {#if isClickable}
      <button
        type="button"
        class="flex items-center gap-1 cursor-pointer"
        onclick={handleInfoClick}
      >
        <Info size={18} color="#36A18B" />
      </button>
    {/if}
  </div>
  <div
    class="border-[1px] rounded-lg border-lightgreen px-4 py-3 flex flex-col gap-3"
  >
    {#each assetsToDisplay as { asset } (asset.address)}
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-1.5">
          {#if !failedImageLoads.has(asset.address)}
            <img
              src={getTokenLogo(asset.address)}
              alt={asset.symbol}
              class="w-5 h-5 rounded-full overflow-hidden"
              onerror={() => onImageError(asset.address)}
            />
          {:else}
            <div
              class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden"
            >
              {asset.symbol[0]?.toUpperCase() || "?"}
            </div>
          {/if}
          <p class="text-[14px] font-medium">{asset.symbol}</p>
        </div>
        <div class="flex flex-col items-end">
          <div class="flex items-center gap-1">
            <p class="text-[14px] font-normal">
              {displayAmounts.amounts.get(asset.address) || asset.amount}
            </p>
          </div>
          {#if asset.usdValueStr}
            <p class="text-[10px] medium-font text-[#b6b6b6]">
              ~${formatUsdAmount(
                displayAmounts.usdAmounts.get(asset.address) ||
                  asset.usdValueStr,
              )}
            </p>
          {/if}
        </div>
      </div>
    {/each}

    <!-- Link Creation Fee -->
    {#if linkCreationFeeItem && linkCreationFeeItem.fee}
      <div class="flex flex-col gap-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1.5">
            <img
              src={getTokenLogo(linkCreationFeeItem.asset.address)}
              alt={linkCreationFeeItem.asset.symbol}
              class="w-5 h-5 rounded-full overflow-hidden"
            />
            <p class="text-[14px] font-medium">
              {linkCreationFeeItem.asset.symbol}
            </p>
            <p class="text-[12px] font-normal text-[#b6b6b6] pt-0.5">
              {locale.t("links.linkForm.preview.linkCreationFee")}
            </p>
          </div>
          <div class="flex flex-col items-end">
            <div class="flex items-center gap-1">
              <p class="text-[14px] font-normal">
                {linkCreationFeeItem.fee.amountFormattedStr}
              </p>
            </div>

            {#if linkCreationFeeItem.fee.usdValueStr}
              <p class="text-[10px] font-normal text-[#b6b6b6]">
                ~${formatUsdAmount(linkCreationFeeItem.fee.usdValueStr)}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

{#if !isReceive}
  <AssetTransferInfoDrawer bind:open={assetTransferInfoDrawerOpen} />
{/if}
