<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { linkQuery } from "$modules/links/state/link.svelte";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
    import TxCart from "$modules/links/components/tx-cart/tx-cart.svelte";
    import Action from "$modules/links/types/action/action";
    import { ActionState } from "$modules/links/types/action/actionState";

  let { id }: { id: string } = $props();

  // query for link data (used for loading/refresh) and a local store for view-model
  const linkQueryState = linkQuery(id, ActionType.Receive);
  let link = $state(new LinkStore());

  // safely get asset address text (returns null if not available)
  const assetAddressToText = (asset: any) => {
    try {
      if (asset?.address && typeof asset.address.toText === "function")
        return asset.address.toText();
      if (asset?.IC?.address && typeof asset.IC.address.toText === "function")
        return asset.IC.address.toText();
      if (
        asset?.asset?.IC?.address &&
        typeof asset.asset.IC.address.toText === "function"
      )
        return asset.asset.IC.address.toText();
      return null;
    } catch (e) {
      return null;
    }
  };

  $effect(() => {
    if (linkQueryState?.data?.link) {
      link.from(linkQueryState?.data?.link, linkQueryState?.data?.action);
    }
  });

  const createUseAction = async () => {
    try {
      if (!link.id) throw new Error("Link ID is missing");
      const actionRes = await cashierBackendService.createActionV2({
        linkId: link.id,
        actionType: ActionType.Receive,
      });
      if (actionRes.isErr()) {
        throw actionRes.error;
      }
      link.action = Action.fromBackend(actionRes.value);
      linkQueryState.refresh();
    } catch (err) {
      console.error("end link failed", err);
    }
  };

  const claim = async () => {
    try {
      if (!link.action) {
        throw new Error("No action available to process");
      }
      await cashierBackendService.processActionV2(link.action.id);
      linkQueryState.refresh();
    } catch (err) {
      console.error("claim failed", err);
    }
  };

</script>

{#if linkQueryState.isLoading}
  Loading...
{/if}
{#if link.link}
  <div class="px-4 py-4">
    <div class="flex items-center gap-3 mb-4">
      <h3 class="text-lg font-semibold flex-1 text-center">
          {link.link.title}
      </h3>
    </div>
    
      {#if link.link.asset_info && link.link.asset_info.length > 0}
        <div class="space-y-3 mb-4">
          {#each link.link.asset_info as assetInfo, i}
            <div class="p-3 border rounded flex items-center justify-between">
              <div>
                <div class="text-sm font-medium">
                  {#if assetAddressToText(assetInfo.asset)}
                    {tokenMetadataQuery(assetAddressToText(assetInfo.asset)).data?.symbol ?? assetInfo.label ?? "TOKEN"}
                  {:else}
                    {assetInfo.label ?? "TOKEN"}
                  {/if}
                </div>
                <div class="text-xs text-muted-foreground">
                  {assetInfo.asset.kind}{assetInfo.asset.address ? ` - ${String(assetInfo.asset.address)}` : ''}
                </div>
              </div>
              <div class="text-right">
                <div class="text-lg font-semibold">
                  {#if assetAddressToText(assetInfo.asset)}
                    {parseBalanceUnits(
                      assetInfo.amount_per_link_use_action,
                      tokenMetadataQuery(assetAddressToText(assetInfo.asset)).data?.decimals ?? 8,
                    ).toFixed(5)}
                  {:else}
                    {String(assetInfo.amount_per_link_use_action)}
                  {/if}
                </div>
                <div class="text-xs text-muted-foreground">per claim</div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-sm text-muted-foreground mb-4">No assets</div>
      {/if}

      {#if link.link.state === LinkState.ACTIVE}
        <Button
          variant="outline"
          onclick={createUseAction}
          class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
        >
          Claim
        </Button>
      {/if}
  </div>
{/if}

{#if link.action?.state !== ActionState.Success}
    <TxCart {link} goNext={claim}/>
{/if}