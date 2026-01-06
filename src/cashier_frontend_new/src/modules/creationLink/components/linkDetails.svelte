<script lang="ts">
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
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
  import { feeService } from "$modules/shared/services/feeService";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import { formatFeeAmount } from "$modules/shared/utils/formatNumber";
  import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";
  import { CreateLinkAsset } from "../types/createLinkData";
  import { LinkState } from "$modules/links/types/link/linkState";

  const {
    link,
    errorMessage,
    successMessage,
  }: {
    link: LinkCreationStore | LinkDetailStore;
    errorMessage: string | null;
    successMessage: string | null;
  } = $props();

  // Check if link is LinkDetailStore
  const isLinkDetailStore = link instanceof LinkDetailStore;

  // Get link type from appropriate source
  const linkType = $derived.by(() => {
    if (isLinkDetailStore) {
      return (link as LinkDetailStore).link?.link_type;
    } else {
      return (link as LinkCreationStore).createLinkData.linkType;
    }
  });

  // Check if link type is send type (TIP, AIRDROP, TOKEN_BASKET)
  const isSendLink = $derived.by(() => {
    if (!linkType) return false;
    return isSendLinkType(linkType);
  });

  // Check if link type is receive link
  const isPaymentLink = $derived.by(() => {
    if (!linkType) return false;
    return isPaymentLinkType(linkType);
  });

  // Get link type text
  const linkTypeText = $derived.by(() => {
    if (!linkType) return "";
    return getLinkTypeText(linkType);
  });

  // Get assets with token info
  const assetsWithTokenInfo = $derived.by(() => {
    if (isLinkDetailStore) {
      const linkDetailStore = link as LinkDetailStore;
      if (
        !linkDetailStore.link?.asset_info ||
        linkDetailStore.link.asset_info.length === 0
      ) {
        return [];
      }

      const assets = linkDetailStore.link.asset_info
        .map((assetInfo) => {
          const assetAddress = assetInfo.asset.address?.toString();
          if (!assetAddress) return null;
          return {
            address: assetAddress,
            amount: assetInfo.amount_per_link_use_action,
          };
        })
        .filter(
          (item): item is { address: string; amount: bigint } => item !== null,
        );

      return calculateAssetsWithTokenInfo(
        assets,
        walletStore.findTokenByAddress.bind(walletStore),
      );
    } else {
      const linkCreationStore = link as LinkCreationStore;
      if (
        !linkCreationStore.createLinkData.assets ||
        linkCreationStore.createLinkData.assets.length === 0
      ) {
        return [];
      }

      const assets = linkCreationStore.createLinkData.assets.map((asset) => ({
        address: asset.address,
        amount: asset.useAmount,
      }));

      return calculateAssetsWithTokenInfo(
        assets,
        walletStore.findTokenByAddress.bind(walletStore),
      );
    }
  });

  // Forecast link creation fees for preview
  const forecastLinkCreationFees: ForecastAssetAndFee[] = $derived.by(() => {
    if (isLinkDetailStore) {
      // For LinkDetailStore with CREATE_LINK state, forecast fees from asset_info
      const linkDetailStore = link as LinkDetailStore;
      if (
        !linkDetailStore.link ||
        linkDetailStore.link.state !== LinkState.CREATE_LINK ||
        !linkDetailStore.link.asset_info ||
        linkDetailStore.link.asset_info.length === 0
      ) {
        return [];
      }

      // Convert asset_info to CreateLinkAsset format
      const createLinkAssets = linkDetailStore.link.asset_info
        .map((assetInfo) => {
          const assetAddress = assetInfo.asset.address?.toString();
          if (!assetAddress) return null;
          return new CreateLinkAsset(
            assetAddress,
            assetInfo.amount_per_link_use_action,
          );
        })
        .filter((item): item is CreateLinkAsset => item !== null);

      if (createLinkAssets.length === 0) return [];

      const tokens = Object.fromEntries(
        (walletStore.query.data ?? []).map((t) => [t.address, t]),
      );

      const maxUse = Number(
        linkDetailStore.link.link_use_action_max_count ?? 1n,
      );

      return feeService.forecastLinkCreationFees(
        createLinkAssets,
        maxUse,
        tokens,
      );
    }

    const linkCreationStore = link as LinkCreationStore;
    if (
      !linkCreationStore.createLinkData.assets ||
      linkCreationStore.createLinkData.assets.length === 0
    )
      return [];

    const tokens = Object.fromEntries(
      (walletStore.query.data ?? []).map((t) => [t.address, t]),
    );

    return feeService.forecastLinkCreationFees(
      linkCreationStore.createLinkData.assets,
      linkCreationStore.createLinkData.maxUse,
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
    maxUse={isLinkDetailStore
      ? Number((link as LinkDetailStore).link?.link_use_action_max_count ?? 1n)
      : (link as LinkCreationStore).createLinkData.maxUse}
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
            ~${formatFeeAmount(totalFeesUsd)}
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
