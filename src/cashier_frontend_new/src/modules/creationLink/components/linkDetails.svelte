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
  import { ICP_LEDGER_FEE } from "$modules/token/constants";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { TokenStandard } from "$modules/token/types/tokenStandard";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { toast } from "svelte-sonner";
  import { Ok } from "ts-results-es";

  function syntheticIcpTokenForFees(): TokenWithPriceAndBalance {
    const cfg = feeService.getLinkCreationFee();
    return {
      name: "Internet Computer",
      symbol: cfg.symbol,
      address: cfg.tokenAddress,
      decimals: cfg.decimals,
      enabled: true,
      fee: ICP_LEDGER_FEE,
      is_default: true,
      balance: 0n,
      priceUSD: 0,
      tokenStandards: [TokenStandard.ICRC1],
    };
  }

  function findTokenForFeeBreakdown(address: string) {
    const fromWallet = walletStore.findTokenByAddress(address);
    if (fromWallet.isOk()) return fromWallet;
    if (address === feeService.getLinkCreationFee().tokenAddress) {
      return Ok(syntheticIcpTokenForFees());
    }
    return fromWallet;
  }

  const {
    link,
    errorMessage,
    successMessage,
  }: {
    link: GenericCreationLinkStoreVM & AddAssetVM;
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

  // Token map for fee forecast: wallet list + synthetic ICP when missing (forecast requires ICP for creation fee row)
  const tokensForFeeForecast = $derived.by(
    (): Record<string, TokenWithPriceAndBalance> => {
      const map: Record<string, TokenWithPriceAndBalance> = Object.fromEntries(
        (walletStore.query.data ?? []).map((t) => [t.address, t]),
      );
      const icpAddr = feeService.getLinkCreationFee().tokenAddress;
      if (!map[icpAddr]) {
        map[icpAddr] = syntheticIcpTokenForFees();
      }
      return map;
    },
  );

  // Forecast link creation fees for preview
  const forecastLinkCreationFees: ForecastAssetAndFee[] = $derived.by(() => {
    if (!link.assets || link.assets.length === 0) return [];

    const forecastResult = feeService.forecastLinkCreationFees(
      link.assets,
      link.maxUse,
      tokensForFeeForecast,
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

  // Transaction lock status (currently always "Unlock" for preview links)
  const transactionLockStatus = $derived.by(() => {
    // For now, always return "Unlock" as transaction lock is not yet implemented in backend
    // In the future, this could check link.link for lock status if added to backend
    return "Unlock";
  });

  const feesBreakdown = $derived.by(() => {
    return buildPreviewFeesBreakdown(
      forecastLinkCreationFees,
      findTokenForFeeBreakdown,
    );
  });

  let showFeeInfoDrawer = $state(false);

  function handleFeeBreakdownClick() {
    if (feesBreakdown.length === 0) return;
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
  <TransactionLockSection {transactionLockStatus} />

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
    onBreakdownClick={feesBreakdown.length > 0
      ? handleFeeBreakdownClick
      : undefined}
  />
</div>

<FeeInfoDrawer bind:open={showFeeInfoDrawer} {feesBreakdown} />
