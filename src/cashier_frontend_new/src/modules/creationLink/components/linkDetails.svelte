<script lang="ts">
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { getLinkTypeText } from "$modules/links/utils/linkItemHelpers";
  import { LinkType } from "$modules/links/types/link/linkType";
  import { ICP_LEDGER_CANISTER_ID, ICP_LEDGER_FEE } from "$modules/token/constants";
  import FeeInfoDrawer from "./drawers/FeeInfoDrawer.svelte";
  import { toast } from "svelte-sonner";
  import YouSendSection from "./previewSections/YouSendSection.svelte";
  import FeesBreakdownSection from "./previewSections/FeesBreakdownSection.svelte";
  import LinkInfoSection from "./previewSections/LinkInfoSection.svelte";
  import TransactionLockSection from "./previewSections/TransactionLockSection.svelte";
    import { feeService } from '$modules/transactionCart/services/feeService';

  const {
    link,
    errorMessage,
    successMessage,
  }: {
    link: LinkCreationStore;
    errorMessage: string | null;
    successMessage: string | null;
  } = $props();

  // Get token logo URL
  function getTokenLogo(address: string): string {
    if (address === ICP_LEDGER_CANISTER_ID) {
      return "/icpLogo.png";
    }
    return `https://api.icexplorer.io/images/${address}`;
  }

  // Check if link type is send type (TIP, AIRDROP, TOKEN_BASKET)
  const isSendLink = $derived.by(() => {
    return (
      link.createLinkData.linkType === LinkType.TIP ||
      link.createLinkData.linkType === LinkType.AIRDROP ||
      link.createLinkData.linkType === LinkType.TOKEN_BASKET
    );
  });

  // Check if link type is payment link
  const isPaymentLink = $derived.by(() => {
    return link.createLinkData.linkType === LinkType.RECEIVE_PAYMENT;
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

    return link.createLinkData.assets.map((asset) => {
      const tokenResult = walletStore.findTokenByAddress(asset.address);
      if (tokenResult.isErr()) {
        return null;
      }
      const token = tokenResult.unwrap();
      const amount = parseBalanceUnits(asset.useAmount, token.decimals);
      const usdValue = token.priceUSD ? amount * token.priceUSD : 0;

      return {
        address: asset.address,
        amount,
        token,
        usdValue,
        logo: getTokenLogo(asset.address),
      };
    }).filter((item) => item !== null);
  });

  // Calculate fees breakdown
  type FeeBreakdownItem = {
    name: string;
    amount: bigint;
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    usdAmount: number;
  };

  const feesBreakdown = $derived.by(() => {
    const breakdown: FeeBreakdownItem[] = [];
    const maxUse = link.createLinkData.maxUse || 1;

    // Calculate network fees for each asset
    if (link.createLinkData.assets && link.createLinkData.assets.length > 0) {
      for (const asset of link.createLinkData.assets) {
        const tokenResult = walletStore.findTokenByAddress(asset.address);
        if (tokenResult.isErr()) continue;

        const token = tokenResult.unwrap();
        // Network fee = token.fee * maxUse (one fee per use)
        const networkFee = token.fee * BigInt(maxUse);
        const networkFeeAmount = parseBalanceUnits(networkFee, token.decimals);
        const usdValue = token.priceUSD ? networkFeeAmount * token.priceUSD : 0;

        breakdown.push({
          name: "Network fees",
          amount: networkFee,
          tokenAddress: asset.address,
          tokenSymbol: token.symbol,
          tokenDecimals: token.decimals,
          usdAmount: usdValue,
        });
      }
    }

    // Add link creation fee (always in ICP)
    const linkCreationFeeInfo = feeService.getLinkCreationFee()
    const icpTokenResult = walletStore.findTokenByAddress(linkCreationFeeInfo.tokenAddress);
    if (icpTokenResult.isOk()) {
      const icpToken = icpTokenResult.unwrap();
      const creationFeeAmount = parseBalanceUnits(linkCreationFeeInfo.amount, icpToken.decimals);
      const creationFeeUsd = icpToken.priceUSD ? creationFeeAmount * icpToken.priceUSD : 0;

      breakdown.push({
        name: "Link creation fee",
        amount: linkCreationFeeInfo.amount,
        tokenAddress: linkCreationFeeInfo.tokenAddress,
        tokenSymbol: icpToken.symbol,
        tokenDecimals: icpToken.decimals,
        usdAmount: creationFeeUsd,
      });
    }

    return breakdown;
  });

  // Calculate total fees in USD
  const totalFeesUsd = $derived.by(() => {
    return feesBreakdown.reduce((total, fee) => total + fee.usdAmount, 0);
  });

  // Get link creation fee from breakdown
  const linkCreationFee = $derived.by(() => {
    return feesBreakdown.find((fee) => fee.name === "Link creation fee");
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

  // Debug: Log state data
  $effect(() => {
    console.log("=== Link State Debug ===");
    console.log("link.createLinkData:", link.createLinkData);
    console.log("link.createLinkData.title:", link.createLinkData.title);
    console.log("link.createLinkData.linkType:", link.createLinkData.linkType);
    console.log("link.createLinkData.assets:", link.createLinkData.assets);
    console.log("link.createLinkData.maxUse:", link.createLinkData.maxUse);
    console.log("link.id:", link.id);
    console.log("link.state:", link.state);
    console.log("link.link:", link.link);
    console.log("link.action:", link.action);
    console.log("assetsWithTokenInfo:", assetsWithTokenInfo);
    console.log("walletStore.query.data:", walletStore.query.data);
    console.log("=========================");
  });

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
