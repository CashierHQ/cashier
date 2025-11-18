<script lang="ts">
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionTypeMapper } from "$modules/links/types/action/actionType";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import Completed from "../components/useLink/states/Completed.svelte";
  import Gate from "../components/useLink/states/Gate.svelte";
  import Landing from "../components/useLink/states/Landing.svelte";
  import Unlocked from "../components/useLink/states/Unlocked.svelte";
  import UserLinkStore from "../state/userLinkStore.svelte";

  const {
    id,
  }: {
    id: string;
  } = $props();

  const userStore = new UserLinkStore({ id });

  let showTxCart: boolean = $derived.by(() => {
    return !!(
      userStore?.action && userStore.action.state !== ActionState.SUCCESS
    );
  });

  const onCloseDrawer = () => {
    showTxCart = false;
  };

  const createAction = async () => {
    try {
      if (!userStore?.link) throw new Error("Link detail is missing");
      if (userStore.action) {
        showTxCart = true;
      } else {
        const link = userStore.link;
        const actionType = ActionTypeMapper.fromLinkType(link.link_type);
        const actionRes = await cashierBackendService.createActionV2({
          linkId: link.id,
          actionType,
        });
        if (actionRes.isErr()) {
          throw actionRes.error;
        }
        // Refresh query state to update the derived link with new action
        userStore.query?.refresh();
      }
    } catch (err) {
      console.error("create use action failed", err);
    }
  };

  const claim = async () => {
    try {
      // For now we don't run the backend claim. Advance the user flow instead.
      if (!userStore.action) {
        throw new Error("No action available to process");
      }
      const res = await cashierBackendService.processActionV2(
        userStore.action.id,
      );

      if (res.isErr()) {
        throw res.error;
      }

      userStore.query?.refresh();
      userStore.goNext();
    } catch (err) {
      console.error("claim failed", err);
    }
  };
</script>

{#if userStore.isLoading}
  Loading...
{/if}

{#if userStore.link}
  {#if userStore.link.state === LinkState.INACTIVE_ENDED && userStore.query?.data?.link_user_state !== LinkUserState.COMPLETED}
    <div class="px-4 py-8 text-center">
      <h2 class="text-lg font-semibold">Link ended</h2>
      <p class="text-sm text-muted-foreground mt-2">
        This link has ended and is no longer available.
      </p>
    </div>
  {:else}
    <div class="px-4 py-4">
      <div class="mt-4">
        {#if userStore.step === UserLinkStep.LANDING}
          <Landing userLink={userStore} linkDetail={userStore.linkDetail} />
        {:else if userStore.step === UserLinkStep.GATE}
          <Gate userLink={userStore} />
        {:else if userStore.step === UserLinkStep.ADDRESS_UNLOCKED}
          <Unlocked
            userLink={userStore}
            linkDetail={userStore.linkDetail}
            onCreateUseAction={createAction}
          />
        {:else if userStore.step === UserLinkStep.COMPLETED}
          <Completed linkDetail={userStore.linkDetail} />
        {/if}

        {#if showTxCart && userStore?.link && userStore?.action}
          <TxCart
            isOpen={showTxCart}
            link={userStore.link}
            action={userStore.action}
            goNext={claim}
            {onCloseDrawer}
          />
        {/if}
      </div>
    </div>
  {/if}
{/if}
