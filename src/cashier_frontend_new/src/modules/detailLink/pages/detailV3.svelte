<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogPortal,
    DialogTitle,
  } from "$lib/shadcn/components/ui/dialog";
  import { authState } from "$modules/auth/state/auth.svelte";
  import ConfirmDrawer from "$modules/creationLink/components/drawers/ConfirmDrawer.svelte";
  import LinkInfoSection from "$modules/creationLink/components/previewSections/LinkInfoSection.svelte";
  import ShareLinkSection from "$modules/creationLink/components/previewSections/ShareLinkSection.svelte";
  import TransactionLockSection from "$modules/creationLink/components/previewSections/TransactionLockSection.svelte";
  import { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";
  import { forecastTipSharedFees } from "$modules/creationLink/utils/forecastTipSharedFees";
  import DetailLinkHeader from "$modules/detailLink/components/detailLinkHeader.svelte";
  import UsageInfoSection from "$modules/detailLink/components/usageInfoSection.svelte";
  import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
  import { type ProcessActionResultV3 } from "$modules/detailLink/types/v3/action";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { calculateAssetsWithTokenInfo } from "$modules/links/utils/feesBreakdown";
  import { getLinkTypeTextV3 } from "$modules/links/utils/linkItemHelpers";
  import FeesBreakdownSection from "$modules/shared/components/FeesBreakdownSection.svelte";
  import { feeService } from "$modules/shared/services/feeService";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import LinkTxCartV3 from "$modules/transactionCart/components/LinkTxCartV3.svelte";
  import {
    ActionState as SharedActionState,
    ActionType as SharedActionType,
    LinkState as SharedLinkState,
  } from "$shared";
  import { toast } from "svelte-sonner";

  let {
    id,
    onBack,
  }: {
    id: string;
    onBack: () => Promise<void>;
  } = $props();

  let linkStore = new LinkDetailStoreV3({ id });

  let showCopied: boolean = $state(false);
  let errorMessage: string | null = $state(null);
  let showTxCart: boolean = $state(false);
  let failedImageLoads = $state<Set<string>>(new Set());
  let isEndingLink = $state(false);
  let isCreatingWithdraw = $state(false);
  let showFirstEndLinkConfirm = $state(false);
  let showSecondEndLinkConfirm = $state(false);
  let showCongratulationsDrawer = $state(false);
  let lastClickWasOnButton = $state(false);
  let shouldShowCongratulations = $state(false);

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

  // Watch for link state change from CREATE_LINK to ACTIVE to show congratulations drawer
  $effect(() => {
    if (
      shouldShowCongratulations &&
      linkStore.link &&
      linkStore.link.link_state === SharedLinkState.Active
    ) {
      showCongratulationsDrawer = true;
      shouldShowCongratulations = false;
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
          amount: assetInfo.amount,
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

  // Build assetAndFee from action (from backend) for CREATE_LINK state.
  // Same source as LinkTxCart - fees from backend action, not frontend forecast.
  // Fallback: when action is missing (e.g. anonymous user), use forecast from link.asset_info.
  const assetAndFeeFromAction = $derived.by(() => {
    if (
      !linkStore.link ||
      linkStore.link.link_state !== SharedLinkState.Created
    ) {
      return [];
    }

    const tokens = Object.fromEntries(
      (walletStore.query.data ?? []).map((t) => [t.address, t]),
    );
    const maxUse = Number(linkStore.link.max_use);

    // Primary: use action from backend (logged-in user)
    if (linkStore.backendAction) {
      const walletPrincipal = authState.account?.owner;
      if (!walletPrincipal) return [];

      return feeService.buildFromSharedAction(linkStore.backendAction, tokens);
    }

    // Fallback: action missing (anonymous) - use forecast from link.asset_info
    if (!linkStore.link.asset_info || linkStore.link.asset_info.length === 0) {
      return [];
    }

    const linkAssets: CreateLinkAsset[] = linkStore.link.asset_info
      .map((ai) => {
        const address = ai.asset.address?.toString();
        if (!address) return null;
        return new CreateLinkAsset(address, ai.amount);
      })
      .filter((a): a is CreateLinkAsset => a !== null);

    return forecastTipSharedFees(linkAssets, maxUse, tokens);
  });

  // Total fees in USD from backend action (CREATE_LINK state)
  const totalFeesUsd = $derived.by(() => {
    return assetAndFeeFromAction.reduce(
      (total, item) => total + (item.fee?.usdValue ?? 0),
      0,
    );
  });

  // Check if link type is send type (TIP, AIRDROP, TOKEN_BASKET)
  const isSendLink = $derived.by(() => {
    if (!linkStore.link) return false;
    //return isSendLinkType(linkStore.link.link_type);
    return true; // TODO
  });

  // Check if link type is receive link
  const isPaymentLink = $derived.by(() => {
    if (!linkStore.link) return false;
    //return isPaymentLinkType(linkStore.link.link_type);
    return false; // TODO
  });

  // Get link type text
  const linkTypeText = $derived.by(() => {
    if (!linkStore.link) return "";
    return getLinkTypeTextV3(linkStore.link.link_type);
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

  // Transaction lock status based on link state
  // ACTIVE -> Unlock (can end link, copy link)
  // INACTIVE -> Lock (can withdraw)
  // CREATE_LINK -> Unlock (can create)
  const transactionLockStatus = $derived.by(() => {
    if (!linkStore.link)
      return locale.t("links.linkForm.preview.transactionLockUnlock");

    switch (linkStore.link.link_state) {
      case SharedLinkState.Active:
        return locale.t("links.linkForm.preview.transactionLockUnlock");
      case SharedLinkState.Inactive:
        return locale.t("links.linkForm.preview.transactionLockLock");
      case SharedLinkState.Ended:
        return locale.t("links.linkForm.preview.transactionLockEnded");
      case SharedLinkState.Created:
        return locale.t("links.linkForm.preview.transactionLockUnlock");
      default:
        return locale.t("links.linkForm.preview.transactionLockUnlock");
    }
  });

  const isTransactionLockEnded = $derived.by(() => {
    return linkStore.link?.link_state === SharedLinkState.Ended;
  });

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
      await linkStore.query.refreshAsync();

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
      if (
        linkStore.backendAction &&
        linkStore.backendAction.action_type === SharedActionType.Withdraw
      ) {
        showTxCart = true;
        return;
      }

      await linkStore.createAction(ActionType.WITHDRAW);
      await linkStore.query.refreshAsync();

      if (
        linkStore.backendAction &&
        linkStore.backendAction.action_type === SharedActionType.Withdraw
      ) {
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
        await linkStore.query.refreshAsync();
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

  async function handleProcessAction(): Promise<ProcessActionResultV3> {
    // Store previous state to check if it was CREATE_LINK
    const wasCreateLink =
      linkStore.link?.link_state === SharedLinkState.Created;

    const result = await linkStore.processAction();
    if (result.isSuccess) {
      // Set flag to show congratulations if link was in CREATE_LINK state
      if (wasCreateLink) {
        shouldShowCongratulations = true;
      }

      // Store already updated by processAction (e.g. setFromProcessResult for withdraw)
      toast.success(
        locale.t("links.linkForm.detail.messages.transactionSuccess"),
      );

      // Check immediately if state is already ACTIVE (in case refresh was fast)
      if (
        wasCreateLink &&
        linkStore.link?.link_state === SharedLinkState.Active
      ) {
        showCongratulationsDrawer = true;
        shouldShowCongratulations = false;
      }
    } else {
      toast.error(locale.t("links.linkForm.detail.messages.transactionFailed"));
    }
    return result;
  }

  $effect(() => {
    if (
      linkStore &&
      linkStore.link &&
      linkStore.backendAction &&
      linkStore.backendAction.action_state !== SharedActionState.Success
    ) {
      // Open txCart for CREATE_LINK or INACTIVE (withdraw) actions
      if (
        linkStore.link.link_state === SharedLinkState.Created ||
        (linkStore.link.link_state === SharedLinkState.Inactive &&
          linkStore.backendAction.action_type === SharedActionType.Withdraw)
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
    <DetailLinkHeader linkTitle={linkStore.link.title} {onBack} />
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
        maxUse={Number(linkStore.link.max_use)}
      />

      <!-- Block 2: Transaction Lock -->
      <TransactionLockSection
        {transactionLockStatus}
        isEnded={isTransactionLockEnded}
      />

      <!-- Block 5: Usage Info -->
      <UsageInfoSection
        {assetsWithTokenInfo}
        {failedImageLoads}
        onImageError={handleImageError}
        maxUse={Number(linkStore.link.max_use)}
        useCount={Number(linkStore.link.use_count)}
      />

      <!-- Block 6: Share Link or Fees Breakdown -->
      {#if linkStore.link.link_state === SharedLinkState.Created}
        <FeesBreakdownSection {totalFeesUsd} />
      {:else}
        <ShareLinkSection {link} />
      {/if}
    {/if}

    <div
      class="flex-none w-[95%] mx-auto px-2 sticky bottom-0 left-0 right-0 z-10 mt-auto pt-4"
    >
      {#if linkStore.link.link_state === SharedLinkState.Active}
        <Button
          variant="outline"
          onclick={openEndLinkConfirm}
          disabled={isEndingLink}
          class="w-full h-11 border border-red-200 text-red-600 rounded-full cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-400 transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isEndingLink}
            <div
              class="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"
            ></div>
          {/if}
          {locale.t("links.linkForm.detail.endLink")}
        </Button>
      {/if}

      {#if linkStore.link.link_state === SharedLinkState.Ended}
        <Button
          onclick={goToLinks}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
        >
          {locale.t("links.linkForm.detail.goToLinks")}
        </Button>
      {/if}
    </div>

    <div
      class="flex-none w-full w-[95%] mx-auto px-2 sticky bottom-0 left-0 right-0 z-10 pt-4"
    >
      {#if linkStore.link.link_state === SharedLinkState.Active}
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
      {#if linkStore.link.link_state === SharedLinkState.Inactive}
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
      {#if linkStore.link.link_state === SharedLinkState.Ended}
        <Button
          disabled={true}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen mb-3"
        >
          {locale.t("links.status.ended")}
        </Button>
      {/if}
      {#if linkStore.link.link_state === SharedLinkState.Created}
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

{#if showTxCart && linkStore.backendAction && (linkStore.link?.link_state === SharedLinkState.Created || (linkStore.link?.link_state === SharedLinkState.Inactive && linkStore.backendAction.action_type === SharedActionType.Withdraw))}
  <LinkTxCartV3
    isOpen={showTxCart}
    source={{
      action: linkStore.backendAction,
      icrc112Requests: linkStore.icrc112Requests,
      handleProcessAction,
      linkType: linkStore.link?.link_type,
      maxUse: linkStore.link ? Number(linkStore.link.max_use) : undefined,
    }}
    {onCloseDrawer}
  />
{/if}

{#if linkStore.link}
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
              class="flex-none msx w-[95%] max-w-[516px] mx-auto px-2 pt-2 pb-2 bg-white rounded-[28px]"
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
