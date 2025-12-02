<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { LinkState } from "$modules/links/types/link/linkState";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import { LinkDetailStore } from "../state/linkDetailStore.svelte";
  import LinkInfoSection from "$modules/creationLink/components/previewSections/LinkInfoSection.svelte";
  import TransactionLockSection from "$modules/creationLink/components/previewSections/TransactionLockSection.svelte";
  import YouSendSection from "$modules/creationLink/components/previewSections/YouSendSection.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import { getLinkTypeText, isSendLinkType, isPaymentLinkType } from "$modules/links/utils/linkItemHelpers";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { locale } from "$lib/i18n";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import {
    calculateFeesBreakdown,
    calculateTotalFeesUsd,
    getLinkCreationFeeFromBreakdown,
    calculateAssetsWithTokenInfo,
  } from "$modules/links/utils/feesBreakdown";

  //let { linkStore }: { linkStore: LinkDetailStore } = $props();
  let { id }: { id: string } = $props();

  let linkStore = new LinkDetailStore({ id });

  let showCopied: boolean = $state(false);
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let showTxCart: boolean = $state(false);
  let showFeeInfoDrawer = $state(false);
  let failedImageLoads = $state<Set<string>>(new Set());
  let isEndingLink = $state(false);
  let isCreatingWithdraw = $state(false);

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Convert link.asset_info to assetsWithTokenInfo format
  const assetsWithTokenInfo = $derived.by(() => {
    if (!linkStore.link?.asset_info || linkStore.link.asset_info.length === 0) {
      return [];
    }

    const assets = linkStore.link.asset_info
      .map((assetInfo) => {
        const assetAddress = assetInfo.asset.address?.toString();
        if (!assetAddress) return null;
        return {
          address: assetAddress,
          amount: assetInfo.amount_per_link_use_action,
        };
      })
      .filter((item): item is { address: string; amount: bigint } => item !== null);

    return calculateAssetsWithTokenInfo(
      assets,
      walletStore.findTokenByAddress.bind(walletStore),
    );
  });

  // Check if link type is send type (TIP, AIRDROP, TOKEN_BASKET)
  const isSendLink = $derived.by(() => {
    if (!linkStore.link) return false;
    return isSendLinkType(linkStore.link.link_type);
  });

  // Check if link type is receive link
  const isPaymentLink = $derived.by(() => {
    if (!linkStore.link) return false;
    return isPaymentLinkType(linkStore.link.link_type);
  });

  // Get link type text
  const linkTypeText = $derived.by(() => {
    if (!linkStore.link) return "";
    return getLinkTypeText(linkStore.link.link_type);
  });

  // Calculate fees breakdown
  const feesBreakdown = $derived.by(() => {
    if (!linkStore.link) return [];

    const assetAddresses =
      linkStore.link.asset_info
        ?.map((assetInfo) => assetInfo.asset.address?.toString())
        .filter((addr): addr is string => !!addr) || [];
    const maxUse = Number(linkStore.link.link_use_action_max_count) || 1;

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
      case LinkState.INACTIVE_ENDED:
        return locale.t("links.linkForm.preview.transactionLockEnded");
      case LinkState.CREATE_LINK:
        return locale.t("links.linkForm.preview.transactionLockUnlock");
      default:
        return locale.t("links.linkForm.preview.transactionLockUnlock");
    }
  });

  const isTransactionLockEnded = $derived.by(() => {
    return linkStore.link?.state === LinkState.INACTIVE_ENDED;
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
    isEndingLink = true;

    try {
      if (!linkStore.link) throw new Error("Link is missing");
      await linkStore.disableLink();
      // Refresh to get updated link state and any withdraw action
      await linkStore.query.refresh();
      const successMsg = locale.t("links.linkForm.detail.messages.linkEndedSuccess");
      successMessage = successMsg;
      toast.success(successMsg);
        // If there's a withdraw action after ending the link, open txCart
        if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
        showTxCart = true;
      }
    } catch (err) {
      const errorMsg = locale.t("links.linkForm.detail.messages.failedToEndLink") + (err instanceof Error ? err.message : "");
      errorMessage = errorMsg;
      toast.error(errorMsg);
    } finally {
      isEndingLink = false;

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
    isCreatingWithdraw = true;

    try {
      if (!linkStore.link) {
        throw new Error("Link is missing");
      }

      // Check if withdraw action already exists
      if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
        // Action already exists, just open the modal
        showTxCart = true;
        return;
      }

      // Create withdraw action
      await linkStore.createAction(ActionType.WITHDRAW);
      // Refresh query to get the newly created action
      await linkStore.query.refresh();
      // Wait a bit for the query to update the action
      // Check again if action exists after refresh
      if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
        showTxCart = true;
      } else {
        // If action still doesn't exist, try to wait a bit more
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
          showTxCart = true;
        }
      }
    } catch (err) {
      const errorMessageText = err instanceof Error ? err.message : String(err);
      
      // If error is "Request lock already exists" or "Action already exists", 
      // it means action was already created, so just open the modal
      if (
        errorMessageText.includes("Request lock already exists") ||
        errorMessageText.includes("Action already exists") ||
        errorMessageText.includes("already exists")
      ) {
        // Refresh to get the existing action
        await linkStore.query.refresh();
        // Wait a bit for the query to update
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Open modal if action exists
        if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
          showTxCart = true;
        } else {
          // If still no action, show error
          const errorMsg =
            locale.t("links.linkForm.detail.messages.failedToCreateWithdrawAction") +
            errorMessageText;
          errorMessage = errorMsg;
          toast.error(errorMsg);
        }
      } else {
        // For other errors, show error message
        const errorMsg =
          locale.t("links.linkForm.detail.messages.failedToCreateWithdrawAction") +
          errorMessageText;
        errorMessage = errorMsg;
        toast.error(errorMsg);
      }
    } finally {
      isCreatingWithdraw = false;
    }
  }

  function goToLinks() {
    goto(resolve("/links"));
  }

  async function handleProcessAction(): Promise<ProcessActionResult> {
    const result = await linkStore.processAction();
    // After successful processing, refresh to get updated link state
    // Backend will change status to INACTIVE_ENDED after successful withdraw
    if (result.isSuccess) {
      await linkStore.query.refresh();
    }
    return result;
  }

  $effect(() => {
    if (
      linkStore &&
      linkStore.link &&
      linkStore.action &&
      linkStore.action.state !== ActionState.SUCCESS
    ) {
      // Open txCart for CREATE_LINK or INACTIVE (withdraw) actions
      if (
        linkStore.link.state === LinkState.CREATE_LINK ||
        (linkStore.link.state === LinkState.INACTIVE &&
          linkStore.action.type === ActionType.WITHDRAW)
      ) {
        showTxCart = true;
      }
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
      <TransactionLockSection {transactionLockStatus} isEnded={isTransactionLockEnded} />

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
          disabled={isEndingLink}
          class="w-full h-11 border border-red-200 text-red-600 rounded-full mb-3 cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isEndingLink}
            <div class="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          {/if}
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
      {#if linkStore.link.state === LinkState.INACTIVE }
        <Button
          onclick={createWithdrawAction}
          disabled={isCreatingWithdraw}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen gap-2"
        >
          {#if isCreatingWithdraw}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {/if}
          {locale.t("links.linkForm.detail.withdraw")}
        </Button>
      {/if}
      {#if linkStore.link.state === LinkState.INACTIVE_ENDED}
        <Button
          onclick={goToLinks}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
        >
          {locale.t("links.linkForm.detail.goToLinks")}
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

{#if showTxCart && linkStore.action && (linkStore.link?.state === LinkState.CREATE_LINK || (linkStore.link?.state === LinkState.INACTIVE && linkStore.action.type === ActionType.WITHDRAW))}
  <TxCart
    isOpen={showTxCart}
    action={linkStore.action}
    {onCloseDrawer}
    {handleProcessAction}
    isProcessing={isCreatingWithdraw}
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
