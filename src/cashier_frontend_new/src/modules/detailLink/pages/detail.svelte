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
  import { page } from "$app/state";
  import {
    calculateFeesBreakdown,
    calculateTotalFeesUsd,
    calculateAssetsWithTokenInfo,
  } from "$modules/links/utils/feesBreakdown";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogPortal,
  } from "$lib/shadcn/components/ui/dialog";
  import ShareLinkSection from "$modules/creationLink/components/previewSections/ShareLinkSection.svelte";

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
  let showCongratulationsDrawer = $state(false);
  let lastClickWasOnButton = $state(false);

  // Check if we should show congratulations drawer on mount
  $effect(() => {
    const createdParam = page.url.searchParams.get("created");
    if (createdParam === "true") {
      showCongratulationsDrawer = true;
      // Remove the query parameter from URL without reload
      const newUrl = new URL(page.url);
      newUrl.searchParams.delete("created");
      goto(resolve(`/link/detail/${id}`), {
        replaceState: true,
        noScroll: true,
      });
    }
  });

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

  const link = $derived(`${window.location.origin}/link/${linkStore.link?.id}`);

  async function copyLink(closeDialog?: boolean) {
    try {
      const linkUrl = link;
      await navigator.clipboard.writeText(linkUrl);
      showCopied = true;
      toast.success(locale.t("links.linkForm.detail.copied"));
      setTimeout(() => (showCopied = false), 1500);

      if (closeDialog) {
        showCongratulationsDrawer = false;
      }
    } catch (err) {
      console.error("copy failed", err);
      toast.error(
        locale.t("links.linkForm.detail.copyFailed") || "Failed to copy link",
      );
    }
  }

  function handleCongratulationsDialogClose(open: boolean) {
    if (!open) {
      // Dialog is closing
      if (lastClickWasOnButton) {
        const wasOnButton = lastClickWasOnButton;
        lastClickWasOnButton = false;
        // Execute copy in next tick to ensure dialog closes first
        setTimeout(() => {
          if (wasOnButton) {
            copyLink(false);
          }
        }, 0);
      } else {
        // Dialog closed without button click, just reset flag
        lastClickWasOnButton = false;
      }
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
      // Refresh to get updated link state
      await linkStore.query.refresh();

      const successMsg = locale.t(
        "links.linkForm.detail.messages.linkEndedSuccess",
      );
      toast.success(successMsg);
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
      // Check if action already exists
      if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
        showTxCart = true;
        return;
      }

      // Create withdraw action
      await linkStore.createAction(ActionType.WITHDRAW);
      // Refresh query to get the newly created action
      await linkStore.query.refresh();

      // Open drawer if action exists (reactive update will handle it)
      if (linkStore.action && linkStore.action.type === ActionType.WITHDRAW) {
        showTxCart = true;
      }
    } catch (err) {
      const errorMessageText = err instanceof Error ? err.message : String(err);

      // If error is "Request lock already exists" or "Action already exists",
      // it means action was already created, refresh and open drawer
      if (
        errorMessageText.includes("Request lock already exists") ||
        errorMessageText.includes("Action already exists") ||
        errorMessageText.includes("already exists")
      ) {
        // Refresh to get the existing action
        await linkStore.query.refresh();
        // Open drawer - reactive update will handle showing the action
        showTxCart = true;
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

{#if linkStore.query.isLoading && !linkStore.query.data}
  {locale.t("links.linkForm.detail.loading")}
{:else if !linkStore.link}
  <!-- `DetailFlowProtected` will redirect to /links when link is missing. Show a fallback while redirect occurs. -->
  {locale.t("links.linkForm.detail.loading")}
{:else if linkStore.link}
  <div class="space-y-4 flex flex-col h-full grow-1 relative">
    <DetailLinkHeader {linkStore} {onBack} />
    {#if errorMessage}
      <div
        class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded border border-red-200"
      >
        {errorMessage}
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
      <TransactionLockSection
        {transactionLockStatus}
        isEnded={isTransactionLockEnded}
      />

      <!-- Block 4: Fees Breakdown -->
      <FeesBreakdownSection
        {totalFeesUsd}
        isClickable={true}
        onInfoClick={handleFeeInfoClick}
        onBreakdownClick={handleFeeBreakdownClick}
      />

      <!-- Block 5: Share Link -->
      <ShareLinkSection {link} />
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
          onclick={async () => {
            await copyLink();
          }}
          class="relative z-[60] rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
          style={showCongratulationsDrawer ? "visibility: hidden;" : ""}
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

  <Dialog
    bind:open={showCongratulationsDrawer}
    onOpenChange={handleCongratulationsDialogClose}
  >
    <DialogContent class="sm:max-w-[425px]" showCloseButton={false}>
      <DialogHeader class="flex flex-col items-center gap-2.5">
        <div
          class="w-12 h-12 rounded-full bg-[#E8F2EE] flex items-center justify-center mx-auto"
        >
          <img
            src="/congratulations.svg"
            alt="Congratulations"
            width="24"
            height="24"
          />
        </div>
        <DialogTitle class="text-xl font-semibold">
          {locale.t("links.linkForm.detail.congratulations.title")}
        </DialogTitle>
        <DialogDescription
          class="text-[14px] leading-[20px] text-center text-lightblack"
        >
          {locale.t("links.linkForm.detail.congratulations.description")}
        </DialogDescription>
      </DialogHeader>
    </DialogContent>

    <!-- Arrow and button on the same level as modal, positioned at bottom of page -->
    {#if showCongratulationsDrawer}
      <DialogPortal>
        <div class="fixed inset-0 z-[60] pointer-events-none">
          <!-- Arrow pointing down to the button -->
          <div
            class="fixed start-[50%] z-[60] translate-x-[-50%] bottom-16 sm:bottom-[88px] w-full max-w-[calc(100%-2rem)] sm:max-w-[425px] pointer-events-none flex flex-col items-center"
            style="top: calc(50% + 90px);"
          >
            <div
              class="w-full px-3 flex flex-col justify-center py-3 pointer-events-none grow-1 justify-center items-center"
            >
              <div class="w-0.5 grow-1 bg-white"></div>
              <div
                class="w-5 h-5 border-r-2 border-b-2 border-white rotate-45 pointer-events-none translate-y-[-50%]"
              ></div>
            </div>
          </div>

          <!-- Button at bottom of page -->
          <div
            class="fixed bottom-3 sm:bottom-8 left-4 right-4 z-[60] pointer-events-auto"
          >
            <div
              class="flex-none w-full msx w-[95%] max-w-[536px] mx-auto px-2 pt-2 pb-2 bg-white rounded-[28px]"
            >
              <Button
                id="copy-link-button-modal"
                onmousedown={() => {
                  lastClickWasOnButton = true;
                }}
                class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
              >
                {showCopied
                  ? locale.t("links.linkForm.detail.copied")
                  : locale.t("links.linkForm.detail.copyLink")}
              </Button>
            </div>
          </div>
        </div>
      </DialogPortal>
    {/if}
  </Dialog>
{/if}
