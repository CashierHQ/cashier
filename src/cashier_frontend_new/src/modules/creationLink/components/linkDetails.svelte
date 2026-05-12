<script lang="ts">
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import LinkInfoSection from "$modules/creationLink/components/previewSections/LinkInfoSection.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import TransactionLockSection from "$modules/creationLink/components/previewSections/TransactionLockSection.svelte";
  import YouSendPreview from "$modules/creationLink/components/previewSections/YouSendPreview.svelte";
  import { type AddAssetVM } from "$modules/creationLink/types/viewModels/addAssetVM";
  import type { GenericCreationLinkStoreVM } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
  import { buildPreviewFeesBreakdown } from "$modules/creationLink/utils/buildPreviewFeesBreakdown";
  import { calculateAssetsWithTokenInfo } from "$modules/links/utils/feesBreakdown";
  import {
    getLinkTypeText,
    isPaymentLinkType,
    isSendLinkType,
  } from "$modules/links/utils/linkItemHelpers";
  import { feeService } from "$modules/shared/services/feeService";
  import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { toast } from "svelte-sonner";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { locale } from "$lib/i18n";

  const {
    link,
    errorMessage,
    successMessage,
    gatingStore,
  }: {
    link: GenericCreationLinkStoreVM & AddAssetVM;
    errorMessage: string | null;
    successMessage: string | null;
    gatingStore?: GatingStore;
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
    if (!link.assets || link.assets.length === 0) {
      return [];
    }

    const assets = link.assets.map((asset) => ({
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
    if (!link.assets || link.assets.length === 0) return [];

    const tokens = Object.fromEntries(
      (walletStore.query.data ?? []).map((t) => [t.address, t]),
    );

    const forecastResult = feeService.forecastLinkCreationFees(
      link.assets,
      link.maxUse,
      tokens,
    );

    if (forecastResult.isErr()) {
      console.error(
        "Error forecasting link creation fees:",
        forecastResult.unwrapErr(),
      );
      return [];
    }

    return forecastResult.unwrap();
  });

  // Calculate total fees in USD
  const totalFeesUsd = $derived.by(() => {
    return forecastLinkCreationFees.reduce(
      (total, item) => total + (item.fee?.usdValue || 0),
      0,
    );
  });

  const feesBreakdown = $derived.by(() => {
    return buildPreviewFeesBreakdown(
      forecastLinkCreationFees,
      walletStore.findTokenByAddress.bind(walletStore),
    );
  });

  const lockFees = $derived.by(() => {
    if (!gatingStore?.hasLocks) return [];
    // TODO(gating): Hard-coded for now until we have real lock fee data from backend
    return [
      {
        label: locale.t("links.linkForm.lock.fees.password"),
        amount: "0.05 ICP",
        usdAmount: "~$0.2",
      },
    ];
  });

  let showFeeInfoDrawer = $state(false);

  function handleFeeBreakdownClick() {
    if (feesBreakdown.length === 0 && lockFees.length === 0) return;
    showFeeInfoDrawer = true;
  }

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
  <TransactionLockSection {gatingStore} />

  <!-- Block 3: You Send -->
  {#if isSendLink}
    <YouSendPreview
      forecastAssetAndFee={forecastLinkCreationFees}
      {failedImageLoads}
      onImageError={handleImageError}
      isClickable={true}
      {link}
    />
  {/if}

  <!-- Block 4: Fees Breakdown -->
  <FeesBreakdownSection
    {totalFeesUsd}
    onBreakdownClick={feesBreakdown.length > 0 || lockFees.length > 0
      ? handleFeeBreakdownClick
      : undefined}
  />
</div>

<FeeInfoDrawer bind:open={showFeeInfoDrawer} {feesBreakdown} {lockFees} />
