<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { Info, X } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import AssetTransferInfoDrawer from "$modules/creationLink/components/drawers/AssetTransferInfoDrawer.svelte";
  import { FeeType } from "$modules/links/types/fee";
  import type { AssetAndFeeList } from "$modules/shared/types/feeService";
  import { type AssetItem } from "$modules/transactionCart/types/txCart";
  import LinkCreationFeeRow from "./LinkCreationFeeRow.svelte";

  type Props = {
    assetAndFeeList: AssetAndFeeList;
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    isProcessing?: boolean;
    isClickable?: boolean;
    onInfoClick?: () => void;
    hasError?: boolean;
  };

  let {
    assetAndFeeList,
    failedImageLoads,
    onImageError,
    isProcessing = false,
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

  // Filter out link creation fee first
  const assetsWithoutLinkFee = $derived.by(() => {
    return assetAndFeeList.filter(
      (item) => item.fee?.feeType !== FeeType.CREATE_LINK_FEE,
    );
  });

  // Group by direction
  const outgoingAssets = $derived(
    assetsWithoutLinkFee.filter((item) => item.asset.isOutgoing),
  );

  const incomingAssets = $derived(
    assetsWithoutLinkFee.filter((item) => !item.asset.isOutgoing),
  );

  // Link creation fee (always outgoing)
  const linkCreationFeeItem = $derived.by(() => {
    return assetAndFeeList.find(
      (item) => item.fee?.feeType === FeeType.CREATE_LINK_FEE,
    );
  });

  // Has outgoing assets (for drawer logic)
  const hasOutgoingAssets = $derived(
    outgoingAssets.length > 0 || linkCreationFeeItem !== undefined,
  );

  // Derive hasFees from assetAndFeeList
  const hasFees = $derived(
    assetAndFeeList.some((item) => item.fee !== undefined),
  );
</script>

<!-- Reusable asset row snippet -->
{#snippet assetRow(asset: AssetItem)}
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
      <p class="text-[14px] font-normal">{asset.amountFormattedStr}</p>
      {#if asset.usdValueStr}
        <p class="text-[10px] medium-font text-[#b6b6b6]">
          ~${formatUsdAmount(parseFloat(asset.usdValueStr))}
        </p>
      {/if}
    </div>
  </div>
{/snippet}

<div class="flex flex-col gap-4">
  <!-- You Send Section -->
  {#if outgoingAssets.length > 0 || linkCreationFeeItem}
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
        {#each outgoingAssets as { asset } (asset.address)}
          {@render assetRow(asset)}
        {/each}

        <!-- Link Creation Fee (always in send section) -->
        {#if linkCreationFeeItem}
          <LinkCreationFeeRow
            item={linkCreationFeeItem}
            {isProcessing}
            {hasError}
          />
        {/if}
      </div>
    </div>
  {/if}

  <!-- You Receive Section -->
  {#if incomingAssets.length > 0}
    <div class="input-label-field-container">
      <div class="flex items-center w-full justify-between mb-2">
        <Label class="font-medium text-sm">
          {locale.t("links.linkForm.preview.youReceive")}
        </Label>
      </div>
      <div
        class="border-[1px] rounded-lg border-lightgreen px-4 py-3 flex flex-col gap-3"
      >
        {#each incomingAssets as { asset } (asset.address)}
          {@render assetRow(asset)}
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Drawer only for outgoing -->
{#if hasOutgoingAssets}
  <AssetTransferInfoDrawer bind:open={assetTransferInfoDrawerOpen} />
{/if}
