<script lang="ts">
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import Completed from "../components/Completed.svelte";
  import Landing from "../components/Landing.svelte";
  import Unlocked from "../components/Unlocked.svelte";
  import { onDestroy, onMount } from "svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { locale } from "$lib/i18n";

  const {
    onIsLinkChange,
    onShowFooterChange,
  }: {
    onIsLinkChange?: (isLink: boolean) => void;
    onShowFooterChange?: (showFooter: boolean) => void;
  } = $props();

  // Get userLinkStore from context (created by RouteGuard)
  const guardContext = getGuardContext();
  const userStore = guardContext.userLinkStore;

  if (!userStore) {
    throw new Error("userLinkStore not found in context");
  }
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isCreatingAction = $state(false);

  let showTxCart: boolean = $derived.by(() => {
    return !!(
      userStore?.action && userStore.action.state !== ActionState.SUCCESS
    );
  });

  const onCloseDrawer = () => {
    showTxCart = false;
  };

  const handleCreateUseAction = async () => {
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
        userStore.query?.refresh();
      }
    } catch (err) {
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
    return await userStore.processAction();
  };

  // Notify parent about isLink changes based on current step
  $effect(() => {
    if (onIsLinkChange) {
      const step = userStore.state?.step ?? userStore.step;
      const isLink = step !== UserLinkStep.ADDRESS_UNLOCKED;
      onIsLinkChange(isLink);
    }
  });

  // Notify parent about showFooter changes based on current step
  $effect(() => {
    if (onShowFooterChange) {
      const isLanding = userStore.step === UserLinkStep.LANDING;
      const isCompleted = userStore.state?.step === UserLinkStep.COMPLETED;
      const showFooter = isLanding || isCompleted;
      onShowFooterChange(showFooter);
    }
  });

  // Register back handler for AppHeader on the use flow
  const handleBack = async () => {
    if (userStore.step === UserLinkStep.ADDRESS_UNLOCKED) {
      await userStore.goBack();
      return;
    }

    await appHeaderStore.triggerBack();
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

    {#if userStore.step === UserLinkStep.LANDING}
      <div class="py-4">
        <Landing userLink={userStore} />
      </div>
    {:else if userStore.state.step === UserLinkStep.ADDRESS_UNLOCKED}
      <div class="w-full grow-1 flex flex-col">
        <Unlocked
          linkDetail={userStore.linkDetail}
          onCreateUseAction={handleCreateUseAction}
          {isCreatingAction}
          hasAction={!!userStore.action}
        />
        {#if showTxCart && userStore?.link && userStore?.action}
          <TxCart
            isOpen={showTxCart}
            action={userStore.action}
            {onCloseDrawer}
            {handleProcessAction}
          />
        {/if}
      </div>
    {:else if userStore.state.step === UserLinkStep.COMPLETED}
      <Completed linkDetail={userStore.linkDetail} />
    {/if}
  </div>
</div>
