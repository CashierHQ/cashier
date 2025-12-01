<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkType } from "$modules/links/types/link/linkType";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import { LinkDetailStore } from "../state/linkDetailStore.svelte";
  import LinkInfoSection from "$modules/creationLink/components/previewSections/LinkInfoSection.svelte";
  import TransactionLockSection from "$modules/creationLink/components/previewSections/TransactionLockSection.svelte";
  import YouSendSection from "$modules/creationLink/components/previewSections/YouSendSection.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import { getLinkTypeText } from "$modules/links/utils/linkItemHelpers";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
  import { feeService } from "$modules/transactionCart/services/feeService";
  import { locale } from "$lib/i18n";
  import { toast } from "svelte-sonner";

  //let { linkStore }: { linkStore: LinkDetailStore } = $props();
  let { id }: { id: string } = $props();

  let linkStore = new LinkDetailStore({ id });

  let showCopied: boolean = $state(false);
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let showTxCart: boolean = $state(false);
  let showFeeInfoDrawer = $state(false);
  let failedImageLoads = $state<Set<string>>(new Set());

  // Get token logo URL
  function getTokenLogo(address: string): string {
    if (address === ICP_LEDGER_CANISTER_ID) {
      return "/icpLogo.png";
    }
    return `https://api.icexplorer.io/images/${address}`;
  }

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Convert link.asset_info to assetsWithTokenInfo format
  const assetsWithTokenInfo = $derived.by(() => {
    if (!linkStore.link?.asset_info || linkStore.link.asset_info.length === 0) {
      return [];
    }

    return linkStore.link.asset_info
      .map((assetInfo) => {
        const assetAddress = assetInfo.asset.address?.toString();
        if (!assetAddress) return null;

        const tokenResult = walletStore.findTokenByAddress(assetAddress);
        if (tokenResult.isErr()) {
          return null;
        }
        const token = tokenResult.unwrap();
        const amount = parseBalanceUnits(assetInfo.amount_per_link_use_action, token.decimals);
        const usdValue = token.priceUSD ? amount * token.priceUSD : 0;

        return {
          address: assetAddress,
          amount,
          token: {
            symbol: token.symbol,
            decimals: token.decimals,
            priceUSD: token.priceUSD,
          },
          usdValue,
          logo: getTokenLogo(assetAddress),
        };
      })
      .filter((item) => item !== null) as Array<{
        address: string;
        amount: number;
        token: {
          symbol: string;
          decimals: number;
          priceUSD?: number;
        };
        usdValue: number;
        logo: string;
      }>;
  });

  // Check if link type is send type (TIP, AIRDROP, TOKEN_BASKET)
  const isSendLink = $derived.by(() => {
    if (!linkStore.link) return false;
    return (
      linkStore.link.link_type === LinkType.TIP ||
      linkStore.link.link_type === LinkType.AIRDROP ||
      linkStore.link.link_type === LinkType.TOKEN_BASKET
    );
  });

  // Check if link type is payment link
  const isPaymentLink = $derived.by(() => {
    if (!linkStore.link) return false;
    return linkStore.link.link_type === LinkType.RECEIVE_PAYMENT;
  });

  // Get link type text
  const linkTypeText = $derived.by(() => {
    if (!linkStore.link) return "";
    return getLinkTypeText(linkStore.link.link_type);
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
    if (!linkStore.link) return [];

    const breakdown: FeeBreakdownItem[] = [];
    const maxUse = Number(linkStore.link.link_use_action_max_count) || 1;

    // Calculate network fees for each asset
    if (linkStore.link.asset_info && linkStore.link.asset_info.length > 0) {
      for (const assetInfo of linkStore.link.asset_info) {
        const assetAddress = assetInfo.asset.address?.toString();
        if (!assetAddress) continue;

        const tokenResult = walletStore.findTokenByAddress(assetAddress);
        if (tokenResult.isErr()) continue;

        const token = tokenResult.unwrap();
        // Network fee = token.fee * maxUse (one fee per use)
        const networkFee = token.fee * BigInt(maxUse);
        const networkFeeAmount = parseBalanceUnits(networkFee, token.decimals);
        const usdValue = token.priceUSD ? networkFeeAmount * token.priceUSD : 0;

        breakdown.push({
          name: "Network fees",
          amount: networkFee,
          tokenAddress: assetAddress,
          tokenSymbol: token.symbol,
          tokenDecimals: token.decimals,
          usdAmount: usdValue,
        });
      }
    }

    // Add link creation fee (always in ICP)
    const linkCreationFeeInfo = feeService.getLinkCreationFee();
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

  // Transaction lock status based on link state
  // ACTIVE -> Unlock (can end link, copy link)
  // INACTIVE -> Lock (can withdraw)
  // CREATE_LINK -> Unlock (can create)
  const transactionLockStatus = $derived.by(() => {
    if (!linkStore.link) return locale.t("links.linkForm.preview.transactionLockUnlock");

    switch (linkStore.link.state) {
      case LinkState.ACTIVE:
        return locale.t("links.linkForm.preview.transactionLockUnlock");
      case LinkState.INACTIVE:
        return locale.t("links.linkForm.preview.transactionLockLock");
      case LinkState.CREATE_LINK:
        return locale.t("links.linkForm.preview.transactionLockUnlock");
      default:
        return locale.t("links.linkForm.preview.transactionLockUnlock");
    }
  });

  function handleFeeInfoClick() {
    showFeeInfoDrawer = true;
  }

  async function copyLink() {
    try {
      const linkUrl = `${window.location.origin}/link/${linkStore.link?.id}`;
      await navigator.clipboard.writeText(linkUrl);
      showCopied = true;
      toast.success(locale.t("links.linkForm.detail.copied"));
      setTimeout(() => (showCopied = false), 1500);
    } catch (err) {
      console.error("copy failed", err);
      toast.error(locale.t("links.linkForm.detail.copyFailed") || "Failed to copy link");
    }
  }

  async function endLink() {
    errorMessage = null;
    successMessage = null;

    try {
      if (!linkStore.link) throw new Error("Link is missing");
      await linkStore.disableLink();
      successMessage = locale.t("links.linkForm.detail.messages.linkEndedSuccess");
    } catch (err) {
      errorMessage =
        locale.t("links.linkForm.detail.messages.failedToEndLink") + (err instanceof Error ? err.message : "");
    }
  }

  function onCloseDrawer() {
    showTxCart = false;
  }

  function openDrawer() {
    showTxCart = true;
  }

  async function createWithdrawAction() {
    errorMessage = null;

    try {
      if (!linkStore.link) {
        throw new Error("Link is missing");
      }

      await linkStore.createAction(ActionType.WITHDRAW);
    } catch (err) {
      errorMessage =
        locale.t("links.linkForm.detail.messages.failedToCreateWithdrawAction") +
        (err instanceof Error ? err.message : "");
    }
  }

  async function handleProcessAction(): Promise<ProcessActionResult> {
    return await linkStore.processAction();
  }

  $effect(() => {
    if (
      linkStore &&
      linkStore.link &&
      linkStore.link.state === LinkState.CREATE_LINK &&
      linkStore.action &&
      linkStore.action.state !== ActionState.SUCCESS
    ) {
      showTxCart = true;
    }
  });
</script>

{#if linkStore.query.isLoading}
  {locale.t("links.linkForm.detail.loading")}
{:else if !linkStore.link}
  <!-- `DetailFlowProtected` will redirect to /links when link is missing. Show a fallback while redirect occurs. -->
  {locale.t("links.linkForm.detail.loading")}
{:else if linkStore.query.data && linkStore.link}
  <div class="space-y-4 flex flex-col h-full grow-1 relative">
    {#if errorMessage}
      <div
        class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded border border-red-200"
      >
        {errorMessage}
      </div>
    {/if}

    {#if successMessage}
      <div
        class="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded border border-green-200"
      >
        {successMessage}
      </div>
    {/if}

    {#if linkStore.link}
      <!-- Block 1: Link Info -->
      <LinkInfoSection
        {linkTypeText}
        {assetsWithTokenInfo}
        {failedImageLoads}
        onImageError={handleImageError}
        {isPaymentLink}
        {isSendLink}
        maxUse={Number(linkStore.link.link_use_action_max_count)}
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

    {/if}

    <div class="flex-none w-full w-[95%] mx-auto px-2 sticky bottom-0 left-0 right-0 z-10 mt-auto pt-4">
      {#if linkStore.link.state === LinkState.ACTIVE}
        <Button
          variant="outline"
          onclick={endLink}
          class="w-full h-11 border border-red-200 text-red-600 rounded-full mb-3 cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-400 transition-colors"
        >
          {locale.t("links.linkForm.detail.endLink")}
        </Button>
        <Button
          id="copy-link-button"
          onclick={copyLink}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
        >
          {showCopied ? locale.t("links.linkForm.detail.copied") : locale.t("links.linkForm.detail.copyLink")}
        </Button>
      {/if}
      {#if linkStore.link.state === LinkState.INACTIVE}
        <Button
          onclick={createWithdrawAction}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
         >
          {locale.t("links.linkForm.detail.withdraw")}
        </Button>
      {/if}
      {#if linkStore.link.state === LinkState.CREATE_LINK}
        <Button
          onclick={openDrawer}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
          type="button"
        >
          {locale.t("links.linkForm.detail.create")}
        </Button>
      {/if}
    </div>
  </div>
{/if}

{#if showTxCart && linkStore.action && linkStore.link?.state === LinkState.CREATE_LINK}
  <TxCart
    isOpen={showTxCart}
    action={linkStore.action}
    {onCloseDrawer}
    {handleProcessAction}
  />
{/if}

{#if linkStore.link}
  <FeeInfoDrawer
    bind:open={showFeeInfoDrawer}
    onClose={() => {
      showFeeInfoDrawer = false;
    }}
    {feesBreakdown}
    {totalFeesUsd}
  />
{/if}
