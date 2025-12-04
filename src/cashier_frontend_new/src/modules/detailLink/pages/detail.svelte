<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { LinkState } from "$modules/links/types/link/linkState";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import { LinkDetailStore } from "../state/linkDetailStore.svelte";
  import DetailLinkHeader from "../components/detailLinkHeader.svelte";
  import LinkInfoSection from "$modules/creationLink/components/previewSections/LinkInfoSection.svelte";
  import TransactionLockSection from "$modules/creationLink/components/previewSections/TransactionLockSection.svelte";
  import YouSendSection from "$modules/creationLink/components/previewSections/YouSendSection.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import FeeInfoDescriptionDrawer from "$modules/creationLink/components/drawers/FeeInfoDescriptionDrawer.svelte";
  import ConfirmDrawer from "$modules/creationLink/components/drawers/ConfirmDrawer.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import {
    getLinkTypeText,
    isSendLinkType,
    isPaymentLinkType,
  } from "$modules/links/utils/linkItemHelpers";
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
  let {
    id,
    onBack,
  }: {
    id: string;
    onBack: () => Promise<void>;
  } = $props();

  let linkStore = new LinkDetailStore({ id });

  let showCopied: boolean = $state(false);
  let errorMessage: string | null = $state(null);
  let showTxCart: boolean = $state(false);
  let showFeeInfoDrawer = $state(false); // For breakdown button (with ChevronRight)
  let showFeeInfoDescriptionDrawer = $state(false); // For info icon button
  let failedImageLoads = $state<Set<string>>(new Set());
  let isEndingLink = $state(false);
  let isCreatingWithdraw = $state(false);
  let showFirstEndLinkConfirm = $state(false);
  let showSecondEndLinkConfirm = $state(false);

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
      .filter(
        (item): item is { address: string; amount: bigint } => item !== null,
      );

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

  // Keep mobile AppHeader title in sync with detail header
  $effect(() => {
    if (linkStore.link) {
      const name =
        linkStore.link.title?.trim() ||
        locale.t("links.linkForm.header.linkName");
      appHeaderStore.setHeaderName(name);
    } else {
      appHeaderStore.clearHeaderName();
    }
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
    if (!linkStore.link)
      return locale.t("links.linkForm.preview.transactionLockUnlock");

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

  function handleFeeBreakdownClick() {
    showFeeInfoDrawer = true;
  }

  function handleFeeInfoClick() {
    showFeeInfoDescriptionDrawer = true;
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
      toast.error(
        locale.t("links.linkForm.detail.copyFailed") || "Failed to copy link",
      );
    }
  }

  function openEndLinkConfirm() {
    showFirstEndLinkConfirm = true;
  }

  function handleFirstConfirm() {
    showFirstEndLinkConfirm = false;
    showSecondEndLinkConfirm = true;
  }

  async function handleFinalConfirm() {
    showSecondEndLinkConfirm = false;
    await endLink();
  }

  async function endLink() {
    errorMessage = null;
    isEndingLink = true;

    try {
      if (!linkStore.link) throw new Error("Link is missing");
      await linkStore.disableLink();
      // Refresh to get updated link state and any withdraw action
      await linkStore.query.refresh();

      // Wait for withdraw action to appear (if it should be created)
      // Try up to 5 times with 200ms delay between attempts
      let attempts = 0;
      while (attempts < 5 && !linkStore.action) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await linkStore.query.refresh();
        attempts++;
      }

      const successMsg = locale.t(
        "links.linkForm.detail.messages.linkEndedSuccess",
      );
      toast.success(successMsg);
      // If there's a withdraw action after ending the link, open txCart
      if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
        showTxCart = true;
      }
    } catch (err) {
      const errorMsg =
        locale.t("links.linkForm.detail.messages.failedToEndLink") +
        (err instanceof Error ? err.message : "");
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
      // First, try to refresh and check if action already exists
      // This handles the case when action was created by endLink() but hasn't loaded yet
      let attempts = 0;
      while (
        attempts < 3 &&
        (!linkStore.action || linkStore.action.type !== ActionType.WITHDRAW)
      ) {
        await linkStore.query.refresh();
        await new Promise((resolve) => setTimeout(resolve, 300));
        attempts++;
      }

      // If action already exists, just open the drawer
      if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
        showTxCart = true;
        return;
      }

      // Create withdraw action if it doesn't exist
      if (!linkStore.link) {
        throw new Error("Link is missing");
      }

      // Create withdraw action
      await linkStore.createAction(ActionType.WITHDRAW);
      // Refresh query to get the newly created action
      await linkStore.query.refresh();
      // Wait a bit for the query to update the action
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Try to find the action with multiple refresh attempts
      attempts = 0;
      while (
        attempts < 3 &&
        (!linkStore.action || linkStore.action.type !== ActionType.WITHDRAW)
      ) {
        await linkStore.query.refresh();
        await new Promise((resolve) => setTimeout(resolve, 300));
        attempts++;
      }

      // Open drawer if action exists
      if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
        showTxCart = true;
      } else {
        // If still no action, show error
        const errorMsg =
          locale.t(
            "links.linkForm.detail.messages.failedToCreateWithdrawAction",
          ) + " Action was not created";
        errorMessage = errorMsg;
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMessageText = err instanceof Error ? err.message : String(err);

      // If error is "Request lock already exists" or "Action already exists",
      // it means action was already created, so just open the modal
      // Don't show error in this case - action exists, we just need to wait for it to load
      if (
        errorMessageText.includes("Request lock already exists") ||
        errorMessageText.includes("Action already exists") ||
        errorMessageText.includes("already exists")
      ) {
        // Refresh to get the existing action - try multiple times with longer waits
        let attempts = 0;
        while (
          attempts < 10 &&
          (!linkStore.action || linkStore.action.type !== ActionType.WITHDRAW)
        ) {
          await linkStore.query.refresh();
          await new Promise((resolve) => setTimeout(resolve, 300));
          attempts++;
        }

        // Open modal if action exists (it should exist if we got "already exists" error)
        if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
          showTxCart = true;
        } else {
          // Even if we can't find it after many attempts, don't show error
          // because the error "already exists" means it definitely exists on the backend
          // Just try to open the drawer - it might work if action loads later
          showTxCart = true;
        }
      } else {
        // For other errors, show error message
        const errorMsg =
          locale.t(
            "links.linkForm.detail.messages.failedToCreateWithdrawAction",
          ) + errorMessageText;
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
    if (result.isSuccess) {
      await linkStore.query.refresh();
      toast.success(
        locale.t("links.linkForm.detail.messages.transactionSuccess"),
      );
    } else {
      toast.error(locale.t("links.linkForm.detail.messages.transactionFailed"));
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
    <DetailLinkHeader {linkStore} {onBack} />
    {#if errorMessage}
      <div
        class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded border border-red-200"
      >
        {errorMessage}
      </div>
    {/if}

    <!-- {#if successMessage}
      <div
        class="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded border border-green-200"
      >
        {successMessage}
      </div>
    {/if} -->

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
      <TransactionLockSection
        {transactionLockStatus}
        isEnded={isTransactionLockEnded}
      />

      <!-- Block 3: You Send -->
      {#if isSendLink}
        <YouSendSection
          {assetsWithTokenInfo}
          {failedImageLoads}
          onImageError={handleImageError}
          {linkCreationFee}
          isClickable={true}
        />
      {/if}

      <!-- Block 4: Fees Breakdown -->
      <FeesBreakdownSection
        {totalFeesUsd}
        isClickable={true}
        onInfoClick={handleFeeInfoClick}
        onBreakdownClick={handleFeeBreakdownClick}
      />
    {/if}

    <div
      class="flex-none w-full w-[95%] mx-auto px-2 sticky bottom-0 left-0 right-0 z-10 mt-auto pt-4"
    >
      {#if linkStore.link.state === LinkState.ACTIVE}
        <Button
          variant="outline"
          onclick={openEndLinkConfirm}
          disabled={isEndingLink}
          class="w-full h-11 border border-red-200 text-red-600 rounded-full mb-3 cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-400 transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isEndingLink}
            <div
              class="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"
            ></div>
          {/if}
          {locale.t("links.linkForm.detail.endLink")}
        </Button>
        <Button
          id="copy-link-button"
          onclick={copyLink}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
        >
          {showCopied
            ? locale.t("links.linkForm.detail.copied")
            : locale.t("links.linkForm.detail.copyLink")}
        </Button>
      {/if}
      {#if linkStore.link.state === LinkState.INACTIVE}
        <Button
          onclick={createWithdrawAction}
          disabled={isCreatingWithdraw}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen gap-2"
        >
          {#if isCreatingWithdraw}
            <div
              class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            ></div>
          {/if}
          {locale.t("links.linkForm.detail.withdraw")}
        </Button>
      {/if}
      {#if linkStore.link.state === LinkState.INACTIVE_ENDED}
        <Button
          disabled={true}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen mb-3"
        >
          {locale.t("links.status.ended")}
        </Button>
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
  />
  <FeeInfoDescriptionDrawer
    bind:open={showFeeInfoDescriptionDrawer}
    onClose={() => {
      showFeeInfoDescriptionDrawer = false;
    }}
  />

  <ConfirmDrawer
    bind:open={showFirstEndLinkConfirm}
    title={locale.t("links.linkForm.detail.endLinkConfirm.title")}
    confirmButtonText={locale.t(
      "links.linkForm.detail.endLinkConfirm.firstStep.confirmButton",
    )}
    onConfirm={handleFirstConfirm}
  >
    <div class="pb-4 flex flex-col gap-4">
      <div
        class="w-12 h-12 rounded-full bg-[#E8F2EE] flex items-center justify-center"
      >
        <img src="/end-link-confirm-first.svg" alt="" width="24" height="24" />
      </div>
      <p class="text-[14px] font-normal text-[#222222]">
        {locale.t("links.linkForm.detail.endLinkConfirm.firstStep.text")}
      </p>
    </div>
  </ConfirmDrawer>

  <ConfirmDrawer
    bind:open={showSecondEndLinkConfirm}
    title={locale.t("links.linkForm.detail.endLinkConfirm.title")}
    confirmButtonText={locale.t(
      "links.linkForm.detail.endLinkConfirm.secondStep.deleteButton",
    )}
    confirmButtonVariant="destructive"
    onConfirm={handleFinalConfirm}
  >
    <div class="pb-4 flex flex-col gap-4">
      <div
        class="w-12 h-12 rounded-full bg-[#FCE8E8] flex items-center justify-center"
      >
        <img src="/end-link-confirm-second.svg" alt="" width="24" height="24" />
      </div>
      <p class="text-[14px] font-normal text-[#222222]">
        {locale.t("links.linkForm.detail.endLinkConfirm.secondStep.text")}
      </p>
    </div>
  </ConfirmDrawer>
{/if}
