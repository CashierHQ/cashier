<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { paths } from "$modules/routing/paths";
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
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import { authState } from "$modules/auth/state/auth.svelte";
  import ConfirmDrawer from "$modules/creationLink/components/drawers/ConfirmDrawer.svelte";
  import LinkCreationProgressBar from "$modules/creationLink/components/LinkCreationProgressBar.svelte";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import TransactionLocksDrawer from "$modules/creationLink/components/drawers/TransactionLocksDrawer.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import LinkInfoSection from "$modules/creationLink/components/previewSections/LinkInfoSection.svelte";
  import ShareLinkSection from "$modules/creationLink/components/previewSections/ShareLinkSection.svelte";
  import TransactionLockSection from "$modules/creationLink/components/previewSections/TransactionLockSection.svelte";
  import YouSendPreview from "$modules/creationLink/components/previewSections/YouSendPreview.svelte";
  import type {
    AddAssetItem,
    GenericCreationLinkStoreVM,
  } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
  import DetailLinkHeader from "$modules/detailLink/components/detailLinkHeader.svelte";
  import UsageInfoSection from "$modules/detailLink/components/usageInfoSection.svelte";
  import { DetailStoreV3ViewModelAdapter } from "$modules/detailLink/state/adapters/detailStoreV3ViewModelAdapter";
  import type { ProcessActionResult } from "$modules/detailLink/types/genericDetailStoreVM";
  import {
    calculateLinkInfoAssetsWithTokenInfo,
    calculateUsageInfoAssetsWithTokenInfo,
  } from "$modules/detailLink/utils/usageInfo";
  import { getRouteContext } from "$modules/routing/state/routeContext.svelte";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkStep } from "$modules/links/types/linkStep";
  import {
    getLinkTypeText,
    isPaymentLinkType,
    isSendLinkType,
  } from "$modules/links/utils/linkItemHelpers";
  import { feeService } from "$modules/shared/services/feeService";
  import type {
    AssetAndFeeList,
    ForecastAssetAndFee,
  } from "$modules/shared/types/feeService";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import LinkTxCart from "$modules/transactionCart/components/LinkTxCart.svelte";
  import { toast } from "svelte-sonner";

  let {
    id,
    onBack,
  }: {
    id: string;
    onBack: () => Promise<void>;
  } = $props();

  const context = getRouteContext();
  const gatingStore = $derived.by(() => context.gatingStore);
  const linkStore = $derived.by(() => {
    const storeV3 = context.linkDetailStoreV3;
    if (storeV3) {
      return new DetailStoreV3ViewModelAdapter(storeV3);
    }
    return null;
  });

  let showCopied: boolean = $state(false);
  let errorMessage: string | null = $state(null);
  let showTxCart: boolean = $state(false);
  let failedImageLoads = $state<Set<string>>(new Set());
  let isEndingLink = $state(false);
  let isCreatingWithdraw = $state(false);
  let isSyncingBalance = $state(false);
  let showFirstEndLinkConfirm = $state(false);
  let showSecondEndLinkConfirm = $state(false);
  let showCongratulationsDrawer = $state(false);
  let lastClickWasOnButton = $state(false);
  let shouldShowCongratulations = $state(false);
  let detailsLandingTracked = $state(false);
  let showFeeInfoDrawer = $state(false);
  let showTransactionLocksDrawer = $state(false);

  function assetAndFeeListToForecastShape(
    list: AssetAndFeeList,
  ): ForecastAssetAndFee[] {
    return list.map((item) => ({
      asset: {
        label: item.asset.label,
        symbol: item.asset.symbol,
        address: item.asset.address,
        amount: item.asset.amountFormattedStr,
        usdValueStr: item.asset.usdValueStr,
      },
      fee: item.fee,
    }));
  }

  // Track Link details page load (Withdraw funnel)
  $effect(() => {
    if (linkStore && linkStore.link && !detailsLandingTracked) {
      detailsLandingTracked = true;
      trackEvent(AnalyticsEvent.WITHDRAW_LINK_DETAILS, {
        link_type: linkStore.link.link_type,
        BE_link_id: linkStore.link.id ?? "",
      });
    }
  });

  // Check if we should show congratulations drawer on mount
  $effect(() => {
    const createdParam = page.url.searchParams.get("created");
    if (createdParam === "true") {
      showCongratulationsDrawer = true;
      // Remove the query parameter from URL without reload
      const newUrl = new URL(page.url);
      newUrl.searchParams.delete("created");
      goto(resolve(paths.detail(id)), {
        replaceState: true,
        noScroll: true,
      });
    }
  });

  // Watch for link state change from CREATE_LINK to ACTIVE to show congratulations drawer
  $effect(() => {
    if (
      linkStore &&
      shouldShowCongratulations &&
      linkStore.link &&
      linkStore.link.state === LinkState.ACTIVE
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
    return calculateUsageInfoAssetsWithTokenInfo(
      linkStore?.link,
      walletStore.findTokenByAddress.bind(walletStore),
    );
  });

  const linkInfoAssetsWithTokenInfo = $derived.by(() => {
    return calculateLinkInfoAssetsWithTokenInfo(
      linkStore?.link,
      walletStore.findTokenByAddress.bind(walletStore),
    );
  });

  // Build assetAndFee from action (from backend) for CREATE_LINK state.
  // Same source as LinkTxCart - fees from backend action, not frontend forecast.
  const createLinkActionAssetAndFee = $derived.by(() => {
    if (
      !linkStore ||
      !linkStore.link ||
      linkStore.link.state !== LinkState.CREATE_LINK
    ) {
      return [];
    }

    const tokens = Object.fromEntries(
      (walletStore.query.data ?? []).map((t) => [t.address, t]),
    );
    // Primary: use action from backend (logged-in user)
    if (linkStore.action) {
      const walletPrincipal = authState.account?.owner;
      if (!walletPrincipal) return [];

      return feeService.buildFromAction(
        linkStore.action,
        Number(linkStore.link.link_use_action_max_count),
        tokens,
        walletPrincipal,
      );
    }

    return [];
  });

  // Total fees in USD from backend action (CREATE_LINK state)
  const totalFeesUsd = $derived.by(() => {
    return createLinkActionAssetAndFee.reduce(
      (total, item) => total + (item.fee?.usdValue ?? 0),
      0,
    );
  });

  const createLinkFeesBreakdown = $derived.by(() => {
    if (
      !linkStore ||
      !linkStore.link ||
      linkStore.link.state !== LinkState.CREATE_LINK
    ) {
      return [];
    }

    return feeService.buildBreakdown(
      createLinkActionAssetAndFee,
      walletStore.query.data ?? [],
    );
  });

  function handleFeeBreakdownClick() {
    if (createLinkFeesBreakdown.length === 0) return;
    showFeeInfoDrawer = true;
  }

  function handleTransactionLockClick() {
    if (!linkHasGates) return;
    showTransactionLocksDrawer = true;
  }

  // Check if link type is send type (TIP, AIRDROP, TOKEN_BASKET)
  const isSendLink = $derived.by(() => {
    if (!linkStore || !linkStore.link) return false;
    return isSendLinkType(linkStore.link.link_type);
  });

  const createLinkYouSendForecastRows = $derived.by(
    (): ForecastAssetAndFee[] => {
      if (
        !linkStore?.link ||
        linkStore.link.state !== LinkState.CREATE_LINK ||
        !isSendLink
      ) {
        return [];
      }
      return assetAndFeeListToForecastShape(createLinkActionAssetAndFee);
    },
  );

  const youSendPreviewLinkVm = $derived.by(
    (): GenericCreationLinkStoreVM | undefined => {
      const l = linkStore?.link;
      if (
        !linkStore ||
        !l ||
        l.state !== LinkState.CREATE_LINK ||
        !isSendLink
      ) {
        return undefined;
      }
      const addons: AddAssetItem[] = (l.asset_info ?? [])
        .map((ai) => {
          const addr = ai.asset.address?.toText();
          if (!addr) return null;
          return {
            address: addr,
            useAmount: ai.amount_per_link_use_action,
          };
        })
        .filter((x): x is AddAssetItem => x !== null);

      return {
        id: l.id,
        backendId: l.id,
        step: LinkStep.CREATED,
        linkType: l.link_type,
        createLinkData: {
          title: l.title ?? "",
          linkType: l.link_type,
          assets: addons,
          maxUse: Number(l.link_use_action_max_count),
        },
        action: linkStore.action,
        setLinkType: () => {},
        setPendingGateDraft: () => {},
        goNext: async () => {},
        goBack: async () => {},
      };
    },
  );

  // Check if link type is receive link
  const isPaymentLink = $derived.by(() => {
    if (!linkStore || !linkStore.link) return false;
    return isPaymentLinkType(linkStore.link.link_type);
  });

  // Get link type text
  const linkTypeText = $derived.by(() => {
    if (!linkStore || !linkStore.link) return "";
    return getLinkTypeText(linkStore.link.link_type);
  });

  // Keep mobile AppHeader title in sync with detail header
  $effect(() => {
    if (linkStore && linkStore.link) {
      const name =
        linkStore.link.title?.trim() ||
        locale.t("links.linkForm.header.linkName");
      appHeaderStore.setHeaderName(name);
    } else {
      appHeaderStore.clearHeaderName();
    }
  });

  const isTransactionLockEnded = $derived.by(() => {
    return linkStore?.link?.state === LinkState.INACTIVE_ENDED;
  });

  const linkHasGates = $derived.by(() => (linkStore?.gates?.length ?? 0) > 0);

  const link = $derived(
    `${window.location.origin}/link/${linkStore?.link?.id}`,
  );

  async function copyLink(closeDialog: boolean | undefined = undefined) {
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
    if (linkStore && linkStore.link) {
      trackEvent(AnalyticsEvent.WITHDRAW_LINK_END, {
        link_type: linkStore.link.link_type,
        BE_link_id: linkStore.link.id ?? "",
      });
    }
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
      if (!linkStore || !linkStore.link) throw new Error("Link is missing");
      await linkStore.disableLink();
      // Refresh to get updated link state
      await linkStore.refreshAsync();

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

  async function handleSyncAssetBalance() {
    if (
      !linkStore?.syncAssetBalanceCache ||
      (linkStore.link?.state !== LinkState.ACTIVE &&
        linkStore.link?.state !== LinkState.INACTIVE)
    )
      return;
    isSyncingBalance = true;
    try {
      await linkStore.syncAssetBalanceCache();
      toast.success(
        locale.t("links.linkForm.detail.messages.balanceSyncSuccess"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      isSyncingBalance = false;
    }
  }

  function onCloseDrawer() {
    showTxCart = false;
  }

  function openDrawer() {
    showTxCart = true;
  }

  async function createWithdrawAction() {
    if (!linkStore) throw new Error("Link store is missing");
    if (linkStore.link) {
      trackEvent(AnalyticsEvent.WITHDRAW_LANDING, {
        link_type: linkStore.link.link_type,
        BE_link_id: linkStore.link.id ?? "",
      });
    }
    errorMessage = null;
    isCreatingWithdraw = true;

    try {
      if (
        linkStore &&
        linkStore.action &&
        linkStore.action.type === ActionType.WITHDRAW
      ) {
        showTxCart = true;
        return;
      }

      await linkStore.createAction(ActionType.WITHDRAW);
      await linkStore.refreshAsync();

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
        await linkStore.refreshAsync();
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
    goto(resolve(paths.links()));
  }

  async function handleProcessAction(): Promise<ProcessActionResult> {
    if (!linkStore) throw new Error("Link store is missing");

    // Store previous state to check if it was CREATE_LINK
    const wasCreateLink = linkStore.link?.state === LinkState.CREATE_LINK;
    const wasWithdraw =
      linkStore.action?.type === ActionType.WITHDRAW && linkStore.link;

    const result = await linkStore.processAction();
    if (result.isSuccess) {
      if (wasWithdraw) {
        trackEvent(AnalyticsEvent.WITHDRAW_ACTION_SUCCESS, {
          link_type: wasWithdraw.link_type,
          BE_link_id: linkStore.link.id ?? "",
        });
      }
      // Set flag to show congratulations if link was in CREATE_LINK state
      if (wasCreateLink) {
        shouldShowCongratulations = true;
      }

      // Store already updated by processAction (e.g. setFromProcessResult for withdraw)
      toast.success(
        locale.t("links.linkForm.detail.messages.transactionSuccess"),
      );

      // Check immediately if state is already ACTIVE (in case refresh was fast)
      if (wasCreateLink && linkStore.link?.state === LinkState.ACTIVE) {
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

{#if linkStore && linkStore.link}
  <div class="space-y-4 flex flex-col h-full grow-1 relative">
    <DetailLinkHeader linkTitle={linkStore.link.title} {onBack} />
    {#if linkStore.link.state === LinkState.CREATE_LINK}
      <LinkCreationProgressBar filledCount={3} />
    {/if}
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
        assetsWithTokenInfo={linkInfoAssetsWithTokenInfo}
        {failedImageLoads}
        onImageError={handleImageError}
        {isPaymentLink}
        {isSendLink}
        maxUse={Number(linkStore.link.link_use_action_max_count)}
      />

      <!-- Block 2: Transaction Lock -->
      <TransactionLockSection
        gatingStore={gatingStore ?? undefined}
        hasLocks={linkHasGates}
        isEnded={isTransactionLockEnded}
        onLockClick={linkHasGates ? handleTransactionLockClick : undefined}
      />

      {#if linkStore.link.state === LinkState.CREATE_LINK && isSendLink && youSendPreviewLinkVm}
        <YouSendPreview
          forecastAssetAndFee={createLinkYouSendForecastRows}
          {failedImageLoads}
          onImageError={handleImageError}
          isClickable={true}
          link={youSendPreviewLinkVm}
        />
      {:else}
        <UsageInfoSection
          {assetsWithTokenInfo}
          {failedImageLoads}
          onImageError={handleImageError}
          useCount={Number(linkStore.link.link_use_action_counter)}
          onRefresh={handleSyncAssetBalance}
          isRefreshing={isSyncingBalance}
        />
      {/if}

      <!-- Block 6: Share Link or Fees Breakdown -->
      {#if linkStore.link.state === LinkState.CREATE_LINK}
        <FeesBreakdownSection
          {totalFeesUsd}
          onBreakdownClick={createLinkFeesBreakdown.length > 0
            ? handleFeeBreakdownClick
            : undefined}
        />
      {:else}
        <ShareLinkSection {link} />
      {/if}
    {/if}

    <div
      class="flex-none w-[95%] mx-auto px-2 left-0 right-0 z-10 mt-auto pt-2 mb-0"
    >
      {#if linkStore.link.state === LinkState.ACTIVE}
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

      {#if linkStore.link.state === LinkState.INACTIVE_ENDED}
        <Button
          onclick={goToLinks}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
        >
          {locale.t("links.linkForm.detail.goToLinks")}
        </Button>
      {/if}
    </div>

    <div
      class="flex-none w-[95%] mx-auto px-2 sticky bottom-0 left-0 right-0 z-10 pt-4 mb-0"
    >
      {#if linkStore.link.state === LinkState.ACTIVE}
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

  <FeeInfoDrawer
    bind:open={showFeeInfoDrawer}
    feesBreakdown={createLinkFeesBreakdown}
  />
  <TransactionLocksDrawer
    bind:open={showTransactionLocksDrawer}
    locks={linkStore.gates ?? []}
  />
{/if}

{#if showTxCart && linkStore && linkStore.action && (linkStore.link?.state === LinkState.CREATE_LINK || (linkStore.link?.state === LinkState.INACTIVE && linkStore.action.type === ActionType.WITHDRAW))}
  <LinkTxCart
    isOpen={showTxCart}
    source={{
      action: linkStore.action,
      handleProcessAction,
      linkType: linkStore.link?.link_type,
      maxUse: linkStore.link
        ? Number(linkStore.link.link_use_action_max_count)
        : undefined,
    }}
    showProgressBanner={linkStore.link?.state === LinkState.CREATE_LINK}
    {onCloseDrawer}
  />
{/if}

{#if linkStore && linkStore.link}
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
              class="flex-none msx w-[95%] max-w-[510px] mx-auto px-2 pt-2 pb-2 bg-white rounded-[28px]"
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
