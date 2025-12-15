<script lang="ts">
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import {
    getLinkTypeText,
    isSendLinkType,
    isPaymentLinkType,
  } from "$modules/links/utils/linkItemHelpers";
  import { toast } from "svelte-sonner";
  import YouSendPreview from "./previewSections/YouSendPreview.svelte";
  import LinkInfoSection from "./previewSections/LinkInfoSection.svelte";
  import TransactionLockSection from "./previewSections/TransactionLockSection.svelte";
  import { calculateAssetsWithTokenInfo } from "$modules/links/utils/feesBreakdown";
  import {
    feeService,
  } from "$modules/shared/services/feeService";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";
  import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";

  const {
    link,
    errorMessage,
    successMessage,
  }: {
    link: LinkCreationStore;
    errorMessage: string | null;
    successMessage: string | null;
  } = $props();

  // Check if link type is send type (TIP, AIRDROP, TOKEN_BASKET)
  const isSendLink = $derived.by(() => {
    return isSendLinkType(link.createLinkData.linkType);
  });

  // Check if link type is receive link
  const isPaymentLink = $derived.by(() => {
    return isPaymentLinkType(link.createLinkData.linkType);
  });

  // Get link type text
  const linkTypeText = $derived.by(() => {
    return getLinkTypeText(link.createLinkData.linkType);
  });

  // Get assets with token info
  const assetsWithTokenInfo = $derived.by(() => {
    if (
      !link.createLinkData.assets ||
      link.createLinkData.assets.length === 0
    ) {
      return [];
    }

    const assets = link.createLinkData.assets.map((asset) => ({
      address: asset.address,
      amount: asset.useAmount,
    }));

    return calculateAssetsWithTokenInfo(
      assets,
      walletStore.findTokenByAddress.bind(walletStore),
    );
  });

  // Forecast link creation fees for preview
  const forecastLinkCreationFees: ForecastAssetAndFee[] = $derived.by(() => {
    if (!link.createLinkData.assets || link.createLinkData.assets.length === 0)
      return [];

    const tokens = Object.fromEntries(
      (walletStore.query.data ?? []).map((t) => [t.address, t]),
    );

    return feeService.forecastLinkCreationFees(
      link.createLinkData.assets,
      link.createLinkData.maxUse,
      tokens,
    );
  });

  // Calculate total fees in USD
  const totalFeesUsd = $derived.by(() => {
    return forecastLinkCreationFees.reduce(
      (total, item) => total + (item.fee?.usdValue || 0),
      0,
    );
  });

  // Transaction lock status (currently always "Unlock" for preview links)
  const transactionLockStatus = $derived.by(() => {
    // For now, always return "Unlock" as transaction lock is not yet implemented in backend
    // In the future, this could check link.link for lock status if added to backend
    return "Unlock";
  });

  // Track failed image loads
  let failedImageLoads = $state<Set<string>>(new Set());

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Show toast notifications for error and success messages
  let previousErrorMessage = $state<string | null>(null);
  let previousSuccessMessage = $state<string | null>(null);

  $effect(() => {
    if (errorMessage && errorMessage !== previousErrorMessage) {
      previousErrorMessage = errorMessage;
      toast.error(errorMessage);
    }
  });

  $effect(() => {
    if (successMessage && successMessage !== previousSuccessMessage) {
      previousSuccessMessage = successMessage;
      toast.success(successMessage);
    }
  });
</script>

<div class="space-y-4">
  <!-- Block 1: Link Info -->
  <LinkInfoSection
    {linkTypeText}
    {assetsWithTokenInfo}
    {failedImageLoads}
    onImageError={handleImageError}
    {isPaymentLink}
    {isSendLink}
    maxUse={link.createLinkData.maxUse}
  />

  <!-- Block 2: Transaction Lock -->
  <TransactionLockSection {transactionLockStatus} />

  <!-- Block 3: You Send -->
  {#if isSendLink}
    <YouSendPreview
      forecastAssetAndFee={forecastLinkCreationFees}
      {failedImageLoads}
      onImageError={handleImageError}
      isClickable={true}
    />
  {/if}

  <!-- Block 4: Fees Breakdown -->
  <div class="input-label-field-container">
    <div class="flex items-center w-full justify-between mb-2">
      <Label class="font-medium text-sm"
        >{locale.t("links.linkForm.preview.feesBreakdown")}</Label
      >
    </div>
    <div class="border-[1px] rounded-lg border-lightgreen px-4 py-3">
      <div class="flex justify-between items-center">
        <p class="text-[14px] font-medium">
          {locale.t("links.linkForm.preview.totalFees")}
        </p>
        <div class="flex items-center gap-2">
          <p class="text-[14px] font-normal">
            ~${formatUsdAmount(totalFeesUsd)}
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
