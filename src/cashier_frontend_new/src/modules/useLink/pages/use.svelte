<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { locale } from "$lib/i18n";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import type { ProcessActionResult } from "$modules/detailLink/types/genericDetailStoreVM";
  import { getRouteContext } from "$modules/routing/state/routeContext.svelte";
  import { paths } from "$modules/routing/paths";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import LinkTxCart from "$modules/transactionCart/components/LinkTxCart.svelte";
  import Completed from "$modules/useLink/components/Completed.svelte";
  import Landing from "$modules/useLink/components/Landing.svelte";
  import Unlocked from "$modules/useLink/components/Unlocked.svelte";
  import AssetList from "$modules/useLink/components/AssetList.svelte";
  import PasswordUnlockForm from "$modules/gating/components/PasswordUnlockForm.svelte";
  import { ChevronLeft, Lock } from "lucide-svelte";
  import { UserLinkStoreV3ViewModelAdapter } from "$modules/useLink/state/adapters/userLinkStoreV3ViewModelAdapter";
  import {
    shouldRedirectErrorTo404,
    shouldRedirectTo404,
  } from "$modules/useLink/utils/errorHandler";
  import { onDestroy, onMount } from "svelte";

  const {
    onIsLinkChange,
    onShowFooterChange,
  }: {
    onIsLinkChange?: (isLink: boolean) => void;
    onShowFooterChange?: (showFooter: boolean) => void;
  } = $props();

  // Get userLinkStore from route context.
  const context = getRouteContext();
  const userStore = $derived.by(() => {
    const storeV3 = context.userLinkStoreV3;
    if (storeV3) {
      return new UserLinkStoreV3ViewModelAdapter(storeV3);
    }
    return null;
  });

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isCreatingAction = $state(false);
  let useLandingLoggedInTracked = $state(false);
  let useWalletLockedTracked = $state(false);
  let useWalletUnlockedTracked = $state(false);

  const canUseFlowBack = $derived.by(() => {
    if (!userStore || userStore.action) return false;

    return (
      userStore.step === UserLinkStep.ADDRESS_LOCKED ||
      userStore.step === UserLinkStep.GATE ||
      userStore.step === UserLinkStep.ADDRESS_UNLOCKED
    );
  });

  // userStore.action already only ever resolves to a pending (not yet
  // successful) action — see UserLinkStoreV3.action / LinkDetailStoreV3.action.
  let isCartOpen = $derived.by(() => {
    return !!(userStore?.action && userStore?.link);
  });

  const onCloseDrawer = () => {
    isCartOpen = false;
  };

  const handleCreateUseAction = async () => {
    if (!userStore) {
      errorMessage = locale.t(
        "links.linkForm.useLink.errors.linkDetailMissing",
      );
      return;
    }

    if (userStore?.link) {
      trackEvent(AnalyticsEvent.USE_WALLET_USE_UNLOCKED, {
        link_type: userStore.link.link_type,
        BE_link_id: userStore.link?.id ?? "",
      });
    }
    errorMessage = null;
    successMessage = null;

    try {
      if (!userStore?.link) {
        throw new Error(
          locale.t("links.linkForm.useLink.errors.linkDetailMissing"),
        );
      }

      if (!userStore.action) {
        isCreatingAction = true;
        const actionType = userStore.findUseActionType();

        if (!actionType) {
          throw new Error(
            locale.t("links.linkForm.useLink.errors.noActionTypeFound"),
          );
        }

        await userStore.createAction(actionType);
      }

      isCartOpen = true;
    } catch (err) {
      // Check if error requires redirect to 404
      if (shouldRedirectErrorTo404(err, userStore.link ?? undefined)) {
        // Redirect to error page instead of showing toast
        goto(resolve(paths.notFound()));
        return;
      }

      const errorPrefix = locale.t(
        "links.linkForm.useLink.errors.failedToCreateAction",
      );
      errorMessage = `${errorPrefix} ${
        err instanceof Error ? err.message : ""
      }`;
    } finally {
      isCreatingAction = false;
    }
  };

  const handleProcessAction = async (): Promise<ProcessActionResult> => {
    if (!userStore) {
      throw new Error(
        locale.t("links.linkForm.useLink.errors.linkDetailMissing"),
      );
    }

    try {
      const result = await userStore.processAction();

      // Check if result requires redirect to 404
      if (shouldRedirectTo404(result, userStore.link ?? undefined)) {
        goto(resolve(paths.notFound()));
        return result;
      }

      if (result.isSuccess && userStore?.link) {
        trackEvent(AnalyticsEvent.USE_ACTION_SUCCESS, {
          link_type: userStore.link.link_type,
          BE_link_id: userStore.link?.id ?? "",
        });
      }

      return result;
    } catch (err) {
      // Check if error requires redirect to 404
      if (shouldRedirectErrorTo404(err, userStore.link ?? undefined)) {
        goto(resolve(paths.notFound()));
        // Return a result with the current action if it exists
        if (!userStore.action) {
          throw new Error(
            "Action already exists but no action found in store",
            {
              cause: err,
            },
          );
        }
        return {
          action: userStore.action,
          isSuccess: false,
          errors: [err instanceof Error ? err.message : String(err)],
        };
      }

      // Re-throw other errors to be handled by TxCart
      throw err;
    }
  };

  // Use funnel: track landing (logged in), wallet locked, gate, wallet unlocked page loads
  $effect(() => {
    const step = userStore?.state?.step ?? userStore?.step;
    const link = userStore?.link;
    const payload = link
      ? {
          link_type: link.link_type,
          BE_link_id: userStore?.link?.id ?? "",
        }
      : null;

    if (step === UserLinkStep.LANDING && link && !useLandingLoggedInTracked) {
      useLandingLoggedInTracked = true;
      trackEvent(AnalyticsEvent.USE_LANDING_LOGGED_IN, payload!);
    }
    if (
      step === UserLinkStep.ADDRESS_LOCKED &&
      payload &&
      !useWalletLockedTracked
    ) {
      useWalletLockedTracked = true;
      trackEvent(AnalyticsEvent.USE_WALLET_PAGE_LOCKED, payload);
    }
    if (
      step === UserLinkStep.ADDRESS_UNLOCKED &&
      payload &&
      !useWalletUnlockedTracked
    ) {
      useWalletUnlockedTracked = true;
      trackEvent(AnalyticsEvent.USE_WALLET_PAGE_UNLOCKED, payload);
    }
  });

  // Notify parent about isLink changes based on current step
  $effect(() => {
    if (userStore && onIsLinkChange) {
      const step = userStore.state?.step ?? userStore.step;
      const isLink =
        step !== UserLinkStep.ADDRESS_UNLOCKED &&
        step !== UserLinkStep.ADDRESS_LOCKED &&
        step !== UserLinkStep.GATE;
      onIsLinkChange(isLink);
    }
  });

  // Notify parent about showFooter changes based on current step
  $effect(() => {
    if (userStore && onShowFooterChange) {
      const isLanding = userStore.step === UserLinkStep.LANDING;
      const isCompleted = userStore.state?.step === UserLinkStep.COMPLETED;
      const showFooter = isLanding || isCompleted;
      onShowFooterChange(showFooter);
    }
  });

  const handleWalletUnlockLocked = async () => {
    if (!userStore) {
      errorMessage = locale.t(
        "links.linkForm.useLink.errors.linkDetailMissing",
      );
      return;
    }
    if (userStore?.link) {
      trackEvent(AnalyticsEvent.USE_WALLET_UNLOCK_LOCKED, {
        link_type: userStore.link.link_type,
        BE_link_id: userStore.link?.id ?? "",
      });
    }
    await userStore.goNext();
  };

  const handleGateContinue = async () => {
    if (!userStore) {
      errorMessage = locale.t(
        "links.linkForm.useLink.errors.linkDetailMissing",
      );
      return;
    }
    if (userStore?.link) {
      trackEvent(AnalyticsEvent.USE_GATE_CONTINUE, {
        link_type: userStore.link.link_type,
        BE_link_id: userStore.link?.id ?? "",
      });
    }
    await userStore.goNext();
  };

  const handleUseFlowBack = async () => {
    if (!userStore) return;

    try {
      await userStore.goBack();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  };

  // Register back handler for AppHeader on the use flow
  const handleBack = async () => {
    if (canUseFlowBack) {
      await handleUseFlowBack();
    }
  };

  onMount(() => {
    appHeaderStore.setBackHandler(handleBack);
  });

  onDestroy(() => {
    appHeaderStore.clearBackHandler();
  });
</script>

<div class="w-full grow-1 flex flex-col">
  <div class="w-full grow-1 flex flex-col">
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

    {#if canUseFlowBack}
      <div class="hidden md:flex flex-none items-center mb-2">
        <button
          onclick={handleUseFlowBack}
          class="cursor-pointer text-[1.5rem] transition-transform hover:scale-105"
          type="button"
          aria-label={locale.t("links.linkForm.header.back")}
        >
          <ChevronLeft class="w-[25px] h-[25px]" aria-hidden="true" />
        </button>
      </div>
    {/if}

    {#if userStore && userStore.step === UserLinkStep.LANDING}
      <div class="py-4">
        <Landing userLink={userStore} />
      </div>
    {:else if userStore && userStore.state.step === UserLinkStep.ADDRESS_LOCKED && userStore.link}
      <div class="w-full grow-1 flex flex-col justify-between">
        <AssetList assetInfo={userStore.link.asset_info} />
        <div
          class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto flex flex-col gap-3"
        >
          <div
            class="flex items-center justify-center gap-2 text-sm text-red-500 bg-red-50 rounded-full px-4 py-2 border border-red-200"
          >
            <Lock class="h-4 w-4 shrink-0" />
            {locale.t("links.linkForm.useLink.transactionLocked") ??
              "This transaction is locked!"}
          </div>
          <PrimaryActionButton onclick={handleWalletUnlockLocked}>
            {locale.t("links.linkForm.useLink.unlockButton") ?? "Unlock"}
          </PrimaryActionButton>
        </div>
      </div>
    {:else if userStore && userStore.state.step === UserLinkStep.GATE}
      <PasswordUnlockForm
        linkId={userStore.link?.id ?? ""}
        gates={context.userLinkStoreV3?.linkDetail?.gates ?? []}
        onUnlocked={handleGateContinue}
      />
    {:else if userStore && userStore.state.step === UserLinkStep.ADDRESS_UNLOCKED && userStore.link}
      <div class="w-full grow-1 flex flex-col">
        <Unlocked
          link={userStore.link}
          onCreateUseAction={handleCreateUseAction}
          {isCreatingAction}
          hasAction={!!userStore.action}
        />
        {#if userStore?.link && userStore?.action && isCartOpen}
          <LinkTxCart
            isOpen={isCartOpen}
            source={{
              action: userStore.action,
              handleProcessAction,
              linkType: userStore.link?.link_type,
              maxUse: userStore.link
                ? Number(userStore.link.link_use_action_max_count)
                : undefined,
            }}
            {onCloseDrawer}
          />
        {/if}
      </div>
    {:else if userStore && userStore.state.step === UserLinkStep.COMPLETED && userStore.link}
      <Completed link={userStore.link} />
    {/if}
  </div>
</div>
