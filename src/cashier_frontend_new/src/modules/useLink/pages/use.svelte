<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import Completed from "../components/Completed.svelte";
  import Landing from "../components/Landing.svelte";
  import NotFound from "../components/NotFound.svelte";
  import Unlocked from "../components/Unlocked.svelte";
  import UserLinkStore from "../state/userLinkStore.svelte";

  const {
    id,
  }: {
    id: string;
  } = $props();

  const userStore = new UserLinkStore({ id });
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  let showTxCart: boolean = $derived.by(() => {
    return !!(
      userStore?.action && userStore.action.state !== ActionState.SUCCESS
    );
  });

  // Redirect to link page if link ended and user hasn't completed
  $effect(() => {
    if (
      userStore.link?.state === LinkState.INACTIVE_ENDED &&
      userStore.query.data?.link_user_state !== LinkUserState.COMPLETED
    ) {
      goto(resolve(`/link/${id}`));
    }
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
        await userStore.createAction(ActionType.RECEIVE);
        // Refresh query state to update the derived link with new action
        userStore.query?.refresh();
      }
    } catch (err) {
      console.error("create use action failed", err);
      errorMessage = (err as Error).message;
    }
  };

  const handleProcessAction = async (): Promise<ProcessActionResult> => {
    return await userStore.processAction();
  };
</script>

{#if !userStore.link && userStore.isLoading}
  Loading...
{:else if userStore.link}
  <div class="px-4 py-4">
    <div class="mt-4">
      {#if userStore.step === UserLinkStep.LANDING}
        <Landing userLink={userStore} />
      {:else if userStore.step === UserLinkStep.ADDRESS_UNLOCKED}
        <Unlocked
          userLink={userStore}
          linkDetail={userStore.linkDetail}
          onCreateUseAction={handleCreateUseAction}
        />
      {:else if userStore.step === UserLinkStep.COMPLETED}
        <Completed linkDetail={userStore.linkDetail} />
      {/if}

      {#if showTxCart && userStore?.link && userStore?.action}
        <TxCart
          isOpen={showTxCart}
          action={userStore.action}
          {onCloseDrawer}
          {handleProcessAction}
        />
      {/if}
    </div>
  </div>
{:else}
  <NotFound />
{/if}
