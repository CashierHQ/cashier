<script lang="ts">
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { getLinkTypeText, isSendLinkType, isPaymentLinkType } from "$modules/links/utils/linkItemHelpers";
  import FeeInfoDrawer from "./drawers/FeeInfoDrawer.svelte";
  import { toast } from "svelte-sonner";
  import YouSendSection from "./previewSections/YouSendSection.svelte";
  import FeesBreakdownSection from "./previewSections/FeesBreakdownSection.svelte";
  import LinkInfoSection from "./previewSections/LinkInfoSection.svelte";
  import TransactionLockSection from "./previewSections/TransactionLockSection.svelte";
  import {
    calculateFeesBreakdown,
    calculateTotalFeesUsd,
    getLinkCreationFeeFromBreakdown,
    calculateAssetsWithTokenInfo,
  } from "$modules/links/utils/feesBreakdown";

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
    if (!link.createLinkData.assets || link.createLinkData.assets.length === 0) {
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

  // Calculate fees breakdown
  const feesBreakdown = $derived.by(() => {
    const assetAddresses =
      link.createLinkData.assets?.map((asset) => asset.address) || [];
    const maxUse = link.createLinkData.maxUse || 1;

    return calculateFeesBreakdown(
      assetAddresses,
      maxUse,
      walletStore.findTokenByAddress.bind(walletStore),
    );
  });

  // Calculate total fees in USD
  const totalFeesUsd = $derived.by(() => {
    return calculateTotalFeesUsd(feesBreakdown);
  });

  // Get link creation fee from breakdown
  const linkCreationFee = $derived.by(() => {
    return getLinkCreationFeeFromBreakdown(feesBreakdown);
  });

  // Transaction lock status (currently always "Unlock" for preview links)
  const transactionLockStatus = $derived.by(() => {
    // For now, always return "Unlock" as transaction lock is not yet implemented in backend
    // In the future, this could check link.link for lock status if added to backend
    return "Unlock";
  });

  // Track failed image loads
  let failedImageLoads = $state<Set<string>>(new Set());

  // Drawer states
  let showFeeInfoDrawer = $state(false);

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Handlers for info drawers
  function handleFeeInfoClick() {
    showFeeInfoDrawer = true;
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
    <YouSendSection
      {assetsWithTokenInfo}
      {failedImageLoads}
      onImageError={handleImageError}
      linkCreationFee={linkCreationFee}
    />
  {/if}

  <!-- Block 4: Fees Breakdown -->
  <FeesBreakdownSection
    {totalFeesUsd}
    isClickable={true}
    onInfoClick={handleFeeInfoClick}
  />

  <!-- Drawer Components -->
  <FeeInfoDrawer
    bind:open={showFeeInfoDrawer}
    onClose={() => {
      showFeeInfoDrawer = false;
    }}
    {feesBreakdown}
    {totalFeesUsd}
  />
</div>
