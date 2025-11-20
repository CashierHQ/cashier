<script lang="ts">
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionTypeMapper } from "$modules/links/types/action/actionType";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import Completed from "../components/Completed.svelte";
  import Unlocked from "../components/Unlocked.svelte";
  import UserLinkStore from "../state/userLinkStore.svelte";
  import Landing from "../components/Landing.svelte";
  import UseLinkProtected from "../components/useFlowProtected.svelte";

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

<UseLinkProtected {userStore} linkId={id}>
  <div class="px-4 py-4">
    <div class="mt-4">
      {#if userStore.state.step === UserLinkStep.LANDING}
        <Landing userLink={userStore} />
      {:else if userStore.state.step === UserLinkStep.ADDRESS_UNLOCKED}
        <Unlocked
          userLink={userStore}
          linkDetail={userStore.linkDetail}
          onCreateUseAction={createAction}
        />
        {#if showTxCart && userStore?.link && userStore?.action}
          <TxCart
            isOpen={showTxCart}
            link={userStore.link}
            action={userStore.action}
            goNext={claim}
            {onCloseDrawer}
          />
        {/if}
      {:else if userStore.state.step === UserLinkStep.COMPLETED}
        <Completed linkDetail={userStore.linkDetail} />
      {/if}
    </div>
  </div>
</UseLinkProtected>
