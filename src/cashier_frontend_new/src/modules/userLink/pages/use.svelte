<script lang="ts">
  import { LinkDetailStore } from "$modules/links/state/linkDetailStore.svelte";
  import { ActionTypeMapper } from "$modules/links/types/action/actionType";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import TxCart from "$modules/links/components-old/txCart/txCart.svelte";
  import { ActionState } from "$modules/links/types/action/actionState";

  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import UserLinkStore from "../state/userLinkStore.svelte";
  import Landing from "../components/useLink/states/Landing.svelte";
  import Locked from "../components/useLink/states/Locked.svelte";
  import Gate from "../components/useLink/states/Gate.svelte";
  import Unlocked from "../components/useLink/states/Unlocked.svelte";
  import Completed from "../components/useLink/states/Completed.svelte";

  let { id }: { id: string } = $props();

  const linkDetail = new LinkDetailStore({
    id,
  });

  let showTxCart: boolean = $derived.by(() => {
    return !!(
      linkDetail?.action && linkDetail.action.state !== ActionState.SUCCESS
    );
  });

  const onCloseDrawer = () => {
    showTxCart = false;
  };

  const createAction = async () => {
    try {
      if (!linkDetail?.link) throw new Error("Link detail is missing");
      if (linkDetail.action) {
        showTxCart = true;
      } else {
        const link = linkDetail.link;
        const actionType = ActionTypeMapper.fromLinkType(link.link_type);
        const actionRes = await cashierBackendService.createActionV2({
          linkId: link.id,
          actionType,
        });
        if (actionRes.isErr()) {
          throw actionRes.error;
        }
        // Refresh query state to update the derived link with new action
        linkDetail.query.refresh();
      }
    } catch (err) {
      console.error("create use action failed", err);
    }
  };

  const claim = async () => {
    try {
      // For now we don't run the backend claim. Advance the user flow instead.
      if (!linkDetail.action) {
        throw new Error("No action available to process");
      }
      const res = await cashierBackendService.processActionV2(
        linkDetail.action.id,
      );

      if (res.isErr()) {
        throw res.error;
      }

      linkDetail.query.refresh();
      userStore.goNext();
    } catch (err) {
      console.error("claim failed", err);
    }
  };

  // temporary flag, gate is not yet implemented
  let lockedFlag: boolean = $state(false);
  let userStore = $state(new UserLinkStore({ locked: false }));

  const setLocked = (v: boolean) => {
    lockedFlag = v;
    userStore = new UserLinkStore({ locked: lockedFlag });
  };
</script>

{#if linkDetail.query.isLoading}
  Loading...
{/if}

{#if linkDetail.link}
  <div class="px-4 py-4">
    <input
      type="checkbox"
      bind:checked={lockedFlag}
      onchange={() => setLocked(lockedFlag)}
    />
    <span class="text-sm">Use locked flow</span>

    <div class="mt-4">
      {#if userStore.step === UserLinkStep.LANDING}
        <Landing userLink={userStore} {linkDetail} />
      {:else if userStore.step === UserLinkStep.ADDRESS_LOCKED}
        <Locked userLink={userStore} {linkDetail} />
      {:else if userStore.step === UserLinkStep.GATE}
        <Gate userLink={userStore} />
      {:else if userStore.step === UserLinkStep.ADDRESS_UNLOCKED}
        <Unlocked
          userLink={userStore}
          {linkDetail}
          onCreateUseAction={createAction}
        />
      {:else if userStore.step === UserLinkStep.COMPLETED}
        <Completed {linkDetail} />
      {/if}

      {#if showTxCart && linkDetail?.link && linkDetail?.action}
        <TxCart
          isOpen={showTxCart}
          link={linkDetail.link}
          action={linkDetail.action}
          goNext={claim}
          {onCloseDrawer}
        />
      {/if}
    </div>
  </div>
{/if}
