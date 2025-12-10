<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { Info, X } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import {
    formatNumber,
    formatUsdAmount,
  } from "$modules/shared/utils/formatNumber";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { formatLinkCreationFeeDisplay } from "$modules/links/utils/feesBreakdown";
  import AssetTransferInfoDrawer from "../drawers/AssetTransferInfoDrawer.svelte";

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
    assetsWithTokenInfo: AssetWithTokenInfo[];
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    linkCreationFee?: {
      amount: bigint;
      tokenAddress: string;
      tokenSymbol: string;
      tokenDecimals: number;
      usdAmount: number;
    };
    isProcessing?: boolean;
    isReceive?: boolean; // If true, show "You receive" instead of "You send"
    isClickable?: boolean; // If false, hide info buttons
    onInfoClick?: () => void; // Handler for info button click
    hasError?: boolean; // If true, show error icon instead of spinner
  };

  let {
    assetsWithTokenInfo,
    failedImageLoads,
    onImageError,
    linkCreationFee,
    isProcessing = false,
    isReceive = false,
    isClickable = false,
    onInfoClick,
    hasError = false,
  }: Props = $props();

  let assetTransferInfoDrawerOpen = $state(false);

  function handleInfoClick() {
    if (onInfoClick) {
      onInfoClick();
    } else {
      assetTransferInfoDrawerOpen = true;
    }
  }

  // Calculate link creation fee display
  const linkCreationFeeDisplay = $derived.by(() => {
    if (!linkCreationFee) return null;
    return formatLinkCreationFeeDisplay({
      name: "Link creation fee",
      amount: linkCreationFee.amount,
      tokenAddress: linkCreationFee.tokenAddress,
      tokenSymbol: linkCreationFee.tokenSymbol,
      tokenDecimals: linkCreationFee.tokenDecimals,
      usdAmount: linkCreationFee.usdAmount,
    });
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
    {#each assetsWithTokenInfo as asset (asset.address)}
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-1.5">
          {#if hasError}
            <X size={16} class="text-red-600" stroke-width={2.5} />
          {:else if isProcessing}
            <div
              class="w-4 h-4 border-2 border-green border-t-transparent rounded-full animate-spin"
            ></div>
          {/if}
          {#if !failedImageLoads.has(asset.address)}
            <img
              src={asset.logo}
              alt={asset.token.symbol}
              class="w-5 h-5 rounded-full overflow-hidden"
              onerror={() => onImageError(asset.address)}
            />
          {:else}
            <div
              class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden"
            >
              {asset.token.symbol[0]?.toUpperCase() || "?"}
            </div>
          {/if}
          <p class="text-[14px] font-medium">{asset.token.symbol}</p>
        </div>
        <div class="flex flex-col items-end">
          <div class="flex items-center gap-1">
            <p class="text-[14px] font-normal">
              {formatNumber(asset.amount)}
            </p>
          </div>
          <p class="text-[10px] medium-font text-[#b6b6b6]">
            ~${formatUsdAmount(asset.usdValue)}
          </p>
        </div>
      </div>
    {/each}

    <!-- Link Creation Fee -->
    {#if linkCreationFee && linkCreationFeeDisplay}
      <div class="flex flex-col gap-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1.5">
            {#if hasError}
              <X size={16} class="text-red-600" stroke-width={2.5} />
            {:else if isProcessing}
              <div
                class="w-4 h-4 border-2 border-green border-t-transparent rounded-full animate-spin"
              ></div>
            {/if}
            <img
              src={getTokenLogo(linkCreationFee.tokenAddress)}
              alt={linkCreationFee.tokenSymbol}
              class="w-5 h-5 rounded-full overflow-hidden"
            />
            <p class="text-[14px] font-medium">{linkCreationFee.tokenSymbol}</p>
            <p class="text-[12px] font-normal text-[#b6b6b6] pt-0.5">
              {locale.t("links.linkForm.preview.linkCreationFee")}
            </p>
          </div>
          <div class="flex flex-col items-end">
            <div class="flex items-center gap-1">
              <p class="text-[14px] font-normal">
                {formatNumber(linkCreationFeeDisplay.amount)}
              </p>
            </div>
            <p class="text-[10px] font-normal text-[#b6b6b6]">
              ~${formatUsdAmount(linkCreationFeeDisplay.usdAmount)}
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

{#if !isReceive}
  <AssetTransferInfoDrawer bind:open={assetTransferInfoDrawerOpen} />
{/if}
