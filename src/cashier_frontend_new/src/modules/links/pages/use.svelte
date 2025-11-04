<script lang="ts">
  import { LinkDetailStore } from "$modules/links/state/linkDetailStore.svelte";
  import { ActionTypeMapper } from "$modules/links/types/action/actionType";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import TxCart from "$modules/links/components/txCart/txCart.svelte";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import Header from "$modules/links/components/useLink/Header.svelte";
  import AssetList from "$modules/links/components/useLink/AssetList.svelte";
  import Actions from "$modules/links/components/useLink/Actions.svelte";

  let { id }: { id: string } = $props();

  const linkDefault = new LinkDetailStore({
    id,
  });

  let showTxCart: boolean = $derived.by(() => {
    return !!(
      linkDefault.action && linkDefault.action.state !== ActionState.SUCCESS
    );
  });

  const onCloseDrawer = () => {
    showTxCart = false;
  };

  // Derive link state from query data with error handling
  const link = $derived.by(() => {
    if (linkDefault.link) {
      try {
        const linkStore = new LinkStore();
        linkStore.from(linkDefault.link, linkDefault.action);
        return linkStore;
      } catch (error) {
        console.error("Failed to create link store from query data:", error);
        return new LinkStore();
      }
    }
    return new LinkStore();
  });

  const createAction = async () => {
    try {
      if (!link.id) throw new Error("Link ID is missing");
      if (!link.link?.link_type) throw new Error("Link type is missing");
      if (link.action) {
        showTxCart = true;
      } else {
        const actionType = ActionTypeMapper.fromLinkType(link.link.link_type);
        const actionRes = await cashierBackendService.createActionV2({
          linkId: link.id,
          actionType,
        });
        if (actionRes.isErr()) {
          throw actionRes.error;
        }
        // Refresh query state to update the derived link with new action
        linkDefault.query.refresh();
      }
    } catch (err) {
      console.error("create use action failed", err);
    }
  };

  const claim = async () => {
    try {
      if (!link.action) {
        throw new Error("No action available to process");
      }
      await cashierBackendService.processActionV2(link.action.id);
      linkDefault.query.refresh();
    } catch (err) {
      console.error("claim failed", err);
    }
  };
</script>

{#if linkDefault.query.isLoading}
  Loading...
{/if}
{#if link.link}
  <div class="px-4 py-4">
    <Header title={link.link.title} />

    <AssetList assetInfo={link.link.asset_info} />

    <Actions link={link.link} onCreateUseAction={createAction} />
  </div>
{/if}

{#if showTxCart && link.link && link.action}
  <TxCart
    isOpen={showTxCart}
    link={link.link}
    action={link.action}
    goNext={claim}
    {onCloseDrawer}
  />
{/if}
