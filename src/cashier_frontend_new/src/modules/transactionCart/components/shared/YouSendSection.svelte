<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { Check, Info, X } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import AssetTransferInfoDrawer from "$modules/creationLink/components/drawers/AssetTransferInfoDrawer.svelte";
  import { FeeType } from "$modules/links/types/fee";
  import type { AssetAndFee } from "$modules/shared/types/feeService";
  import { AssetProcessState } from "$modules/transactionCart/types/txCart";

  type Props = {
    assets: AssetAndFee[];
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    isClickable?: boolean;
    onInfoClick?: () => void;
  };

  let {
    assets,
    failedImageLoads,
    onImageError,
    isClickable = false,
    onInfoClick,
  }: Props = $props();

  let assetTransferInfoDrawerOpen = $state(false);

  function handleInfoClick() {
    if (onInfoClick) {
      onInfoClick();
    } else {
      assetTransferInfoDrawerOpen = true;
    }
  }

  // Separate assets and link creation fee for display
  const assetsToDisplay = $derived.by(() => {
    return assets.filter(
      (item) => item.fee?.feeType !== FeeType.CREATE_LINK_FEE,
    );
  });

  const linkCreationFeeItem = $derived.by(() => {
    return assets.find((item) => item.fee?.feeType === FeeType.CREATE_LINK_FEE);
  });

  // Derive hasFees from assets
  const hasFees = $derived(assets.some((item) => item.fee !== undefined));
</script>

<div class="input-label-field-container">
  <div class="flex items-center w-full justify-between mb-2">
    <div class="flex items-center gap-1">
      <Label class="font-medium text-sm">
        {locale.t("links.linkForm.preview.youSend")}
      </Label>
      {#if hasFees}
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
          {#if asset.state === AssetProcessState.FAILED}
            <X size={16} class="text-red-600" stroke-width={2.5} />
          {:else if asset.state === AssetProcessState.PROCESSING}
            <div
              class="w-4 h-4 border-2 border-green border-t-transparent rounded-full animate-spin"
            ></div>
          {:else if asset.state === AssetProcessState.SUCCEED}
            <Check size={16} class="text-green-600" stroke-width={2.5} />
          {/if}
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
              {asset.amountFormattedStr}
            </p>
          </div>
          {#if asset.usdValueStr}
            <p class="text-[10px] medium-font text-[#b6b6b6]">
              ~${asset.usdValueStr}
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
            {#if linkCreationFeeItem.asset.state === AssetProcessState.FAILED}
              <X size={16} class="text-red-600" stroke-width={2.5} />
            {:else if linkCreationFeeItem.asset.state === AssetProcessState.PROCESSING}
              <div
                class="w-4 h-4 border-2 border-green border-t-transparent rounded-full animate-spin"
              ></div>
            {:else if linkCreationFeeItem.asset.state === AssetProcessState.SUCCEED}
              <Check size={16} class="text-green-600" stroke-width={2.5} />
            {/if}
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
                ~${formatUsdAmount(
                  parseFloat(linkCreationFeeItem.fee.usdValueStr),
                )}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<AssetTransferInfoDrawer bind:open={assetTransferInfoDrawerOpen} />
