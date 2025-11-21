<script lang="ts">
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import Completed from "../components/Completed.svelte";
  import Landing from "../components/Landing.svelte";
  import Unlocked from "../components/Unlocked.svelte";
  import type UserLinkStore from "../state/userLinkStore.svelte";

  const {
    userStore,
  }: {
    userStore: UserLinkStore;
  } = $props();
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

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
      if (!userStore?.link) throw new Error("Link detail is missing");
      if (userStore.action) {
        showTxCart = true;
      } else {
        const actionType = userStore.findUseActionType();
        if (!actionType) {
          throw new Error("No applicable action type found for this link");
        }
        await userStore.createAction(actionType);

        successMessage = "Action created successfully.";
        // Refresh query state to update the derived link with new action
        userStore.query?.refresh();
      }
    } catch (err) {
      errorMessage = `Failed to create action. ${
        err instanceof Error ? err.message : ""
      }`;
    }
  };

  const handleProcessAction = async (): Promise<ProcessActionResult> => {
    return await userStore.processAction();
  };
</script>

<div class="px-4 py-4">
  <div class="mt-4">
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
      <Landing userLink={userStore} />
    {:else if userStore.state.step === UserLinkStep.ADDRESS_UNLOCKED}
      <Unlocked
        userLink={userStore}
        linkDetail={userStore.linkDetail}
        onCreateUseAction={handleCreateUseAction}
      />
      {#if showTxCart && userStore?.link && userStore?.action}
        <TxCart
          isOpen={showTxCart}
          action={userStore.action}
          {onCloseDrawer}
          {handleProcessAction}
        />
      {/if}
    {:else if userStore.state.step === UserLinkStep.COMPLETED}
      <Completed linkDetail={userStore.linkDetail} />
    {/if}
  </div>
</div>
