<script lang="ts">
  import { LinkDetailStore } from "$modules/links/state/linkDetailStore.svelte";
  import { ActionTypeMapper } from "$modules/links/types/action/actionType";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import TxCart from "$modules/links/components/txCart/txCart.svelte";
  import { ActionState } from "$modules/links/types/action/actionState";
  import Header from "$modules/links/components/useLink/Header.svelte";
  import AssetList from "$modules/links/components/useLink/AssetList.svelte";
  import Actions from "$modules/links/components/useLink/Actions.svelte";

  let { id }: { id: string } = $props();

  const linkDetail = new LinkDetailStore({
    id,
  });

  let showTxCart: boolean = $derived.by(() => {
    return !!(
      linkDetail.action && linkDetail.action.state !== ActionState.SUCCESS
    );
  });

  const onCloseDrawer = () => {
    showTxCart = false;
  };

  const createAction = async () => {
    try {
      if (!linkDetail.link) throw new Error("Link detail is missing");
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
      if (!linkDetail.action) {
        throw new Error("No action available to process");
      }
      await cashierBackendService.processActionV2(linkDetail.action.id);
      linkDetail.query.refresh();
    } catch (err) {
      console.error("claim failed", err);
    }
  };
</script>

{#if linkDetail.query.isLoading}
  Loading...
{/if}
{#if linkDetail.link}
  <div class="px-4 py-4">
    <Header title={linkDetail.link.title} />

    <AssetList assetInfo={linkDetail.link.asset_info} />

    <Actions link={linkDetail.link} onCreateUseAction={createAction} />
  </div>
{/if}

{#if showTxCart && linkDetail.link && linkDetail.action}
  <TxCart
    isOpen={showTxCart}
    link={linkDetail.link}
    action={linkDetail.action}
    goNext={claim}
    {onCloseDrawer}
  />
{/if}
