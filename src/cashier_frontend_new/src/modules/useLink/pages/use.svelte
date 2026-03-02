<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import type { ProcessActionResult } from "$modules/detailLink/types/genericDetailStoreVM";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import LinkTxCart from "$modules/transactionCart/components/LinkTxCart.svelte";
  import Completed from "$modules/useLink/components/Completed.svelte";
  import Landing from "$modules/useLink/components/Landing.svelte";
  import Unlocked from "$modules/useLink/components/Unlocked.svelte";
  import { UserLinkStoreV3ViewModelAdapter } from "$modules/useLink/state/adapters/userLinkStoreV3ViewModelAdapter";
  import { UserLinkStoreViewModelAdapter } from "$modules/useLink/state/adapters/userLinkStoreViewModelAdapter";
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

  // Get userLinkStore from context (created by RouteGuard)
  const context = getGuardContext();
  const userStore = $derived.by(() => {
    const storeV3 = context.userLinkStoreV3;
    if (storeV3) {
      return new UserLinkStoreV3ViewModelAdapter(storeV3);
    }
    const store = context.userLinkStore;
    if (store) {
      return new UserLinkStoreViewModelAdapter(store);
    }
    return null;
  });

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isCreatingAction = $state(false);
  let useLandingLoggedInTracked = $state(false);
  let useWalletLockedTracked = $state(false);
  let useGatePageTracked = $state(false);
  let useWalletUnlockedTracked = $state(false);

  let showTxCart: boolean = $derived.by(() => {
    return !!(
      userStore?.action && userStore.action.state !== ActionState.SUCCESS
    );
  });

  const onCloseDrawer = () => {
    showTxCart = false;
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
      if (userStore.action) {
        showTxCart = true;
      } else {
        isCreatingAction = true;
        const actionType = userStore.findUseActionType();

        if (!actionType) {
          throw new Error(
            locale.t("links.linkForm.useLink.errors.noActionTypeFound"),
          );
        }

        await userStore.createAction(actionType);

        successMessage = "Action created successfully.";
        userStore.refreshAsync();
      }
    } catch (err) {
      // Check if error requires redirect to 404
      if (shouldRedirectErrorTo404(err, userStore.link ?? undefined)) {
        // Redirect to error page instead of showing toast
        goto(resolve("/404"));
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
        goto(resolve("/404"));
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
        goto(resolve("/404"));
        // Return a result with the current action if it exists
        if (!userStore.action) {
          throw new Error("Action already exists but no action found in store");
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
    if (step === UserLinkStep.GATE && payload && !useGatePageTracked) {
      useGatePageTracked = true;
      trackEvent(AnalyticsEvent.USE_GATE_PAGE, payload);
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
      const isLink = step !== UserLinkStep.ADDRESS_UNLOCKED;
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

  // Register back handler for AppHeader on the use flow
  const handleBack = async () => {
    if (userStore && userStore.step === UserLinkStep.ADDRESS_UNLOCKED) {
      await userStore.goBack();
      return;
    }

    await appHeaderStore.triggerBack();
  };

  // Register logo click handler for AppHeader on the use flow
  const handleLogoClick = async () => {
    if (!userStore) {
      return;
    }
    try {
      await userStore.goToLanding();
    } catch (error) {
      // goToLanding throws if action exists or invalid state
      // Stay on current page - do nothing
      console.warn("goToLanding blocked:", error);
    }
  };

  onMount(() => {
    appHeaderStore.setBackHandler(handleBack);
    appHeaderStore.setLogoClickHandler(handleLogoClick);
  });

  onDestroy(() => {
    appHeaderStore.clearBackHandler();
    appHeaderStore.clearLogoClickHandler();
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

    {#if userStore && userStore.step === UserLinkStep.LANDING}
      <div class="py-4">
        <Landing userLink={userStore} />
      </div>
    {:else if userStore && userStore.state.step === UserLinkStep.ADDRESS_LOCKED}
      <div class="py-4 flex flex-col gap-4 grow-1">
        <p class="text-sm text-muted-foreground">
          {locale.t("links.linkForm.useLink.walletLocked") ??
            "Connect wallet to continue"}
        </p>
        <Button class="rounded-full mt-auto" onclick={handleWalletUnlockLocked}>
          {locale.t("links.linkForm.useLink.continueButton")}
        </Button>
      </div>
    {:else if userStore && userStore.state.step === UserLinkStep.GATE}
      <div class="py-4 flex flex-col gap-4 grow-1">
        <p class="text-sm text-muted-foreground">
          {locale.t("links.linkForm.useLink.gate") ?? "Continue to claim"}
        </p>
        <Button class="rounded-full mt-auto" onclick={handleGateContinue}>
          {locale.t("links.linkForm.useLink.continueButton")}
        </Button>
      </div>
    {:else if userStore && userStore.state.step === UserLinkStep.ADDRESS_UNLOCKED && userStore.link}
      <div class="w-full grow-1 flex flex-col">
        <Unlocked
          link={userStore.link}
          onCreateUseAction={handleCreateUseAction}
          {isCreatingAction}
          hasAction={!!userStore.action}
        />
        {#if showTxCart && userStore?.link && userStore?.action}
          <LinkTxCart
            isOpen={showTxCart}
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
