<script lang="ts">
  import { linkQuery } from "../state/link.svelte";
  import { LinkStore } from "../state/linkStore.svelte";
  import { ActionType } from "../types/action/actionType";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { ChevronLeft } from "lucide-svelte";
  import { statusBadge } from "../utils/statusBadge";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { cashierBackendService } from "../services/cashierBackend";
  import TxCart from "./tx-cart/tx-cart.svelte";
  import { LinkState } from "../types/link/linkState";

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

  let showCopied: boolean = $state(false);

  let { id }: { id: string } = $props();

  // query for link data (used for loading/refresh) and a local store for view-model
  const linkQueryState = linkQuery(id, ActionType.Withdraw);
  let link = $state(new LinkStore());

  $effect(() => {
    if (linkQueryState?.data?.link) {
      console.log("Link data loaded:", linkQueryState?.data?.link);
        link.from(linkQueryState?.data?.link, linkQueryState?.data?.action);

    }
    
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showCopied = true;
      setTimeout(() => (showCopied = false), 1500);
    } catch (err) {
      console.error("copy failed", err);
    }
  };

  const endLink = async () => {
    try {
      if (!linkQueryState || !linkQueryState.data) return;
      await link.goNext();
      linkQueryState.refresh();
    } catch (err) {
      console.error("end link failed", err);
    }
  };

  const createWithdrawAction = async () => {
    try {
      if (!link.id) throw new Error("Link ID is missing");
      const actionRes = await cashierBackendService.createActionV2({
        linkId: link.id,
        actionType: ActionType.Withdraw,
      });

      if (actionRes.isErr()) {
        throw actionRes.error;
      }

      linkQueryState.refresh();
    } catch (err) {
      console.error("end link failed", err);
    }
  };

  const withdraw = async () => {
    try {
      await link.goNext();
    } catch (err) {
      console.error("withdraw failed", err);
    }
  };

</script>

{#if linkQueryState.isLoading}
  Loading...
{/if}
{#if link.link}
  <div class="px-4 py-4">
    <div class="flex items-center gap-3 mb-4">
      <button
        onclick={() => {
          goto(resolve("/"));
        }}
        class="p-2 cursor-pointer w-8 h-8 flex items-center justify-center"
      >
        <ChevronLeft />
      </button>

      <h3 class="text-lg font-semibold flex-1 text-center">
        {link.link.title}
      </h3>

      <!-- placeholder to keep title centered (matches back button width) -->
      <div class="w-8 h-8" aria-hidden="true"></div>
    </div>

    <div class="text-sm text-muted-foreground mb-2">Link info</div>

    <div class="bg-card border rounded-lg p-4 mb-4">
      <div class="space-y-3 text-sm">
        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">Status</div>
          <div class="font-medium">
            <span class={`${statusBadge(link.link.state).classes}`}>
              {statusBadge(link.link.state).text}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">Type</div>
          <div class="font-medium">{link.link.link_type.id}</div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">User pays</div>
          <div class="font-medium">-</div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">User claims</div>
          <div class="font-medium">
            {#if link.link.asset_info && link.link.asset_info.length > 0}
              <div class="flex gap-2 flex-wrap">
                {#each link.link.asset_info as assetInfo (assetInfo.label + String(assetInfo.amount_per_link_use_action))}
                  <div class="inline-flex items-center text-sm gap-2">
                    <div class="text-sm">
                      {#if assetAddressToText(assetInfo.asset)}
                        {parseBalanceUnits(
                          assetInfo.amount_per_link_use_action,
                          tokenMetadataQuery(
                            assetAddressToText(assetInfo.asset),
                          ).data?.decimals ?? 8,
                        ).toFixed(5)}
                      {:else}
                        {String(assetInfo.amount_per_link_use_action)}
                      {/if}
                    </div>
                    <div class="font-medium">
                      {#if assetAddressToText(assetInfo.asset)}
                        {tokenMetadataQuery(assetAddressToText(assetInfo.asset))
                          .data?.symbol ??
                          assetInfo.label ??
                          "TOKEN"}
                      {:else}
                        {assetInfo.label ?? "TOKEN"}
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              -
            {/if}
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">Max use</div>
          <div class="font-medium">
            {String(link.link.link_use_action_max_count)}
          </div>
        </div>
      </div>
    </div>

    <div class="text-sm text-muted-foreground mb-2">Usage info</div>

    <div class="bg-card border rounded-lg p-4 mb-4">
      <div class="space-y-3 text-sm">
        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">Assets in link</div>
          <div class="font-medium">
            {#if link.link.asset_info && link.link.asset_info.length > 0}
              {link.link.asset_info[0].label}
            {:else}
              Empty
            {/if}
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">Used</div>
          <div class="font-medium">
            {String(link.link.link_use_action_counter)}
          </div>
        </div>
      </div>
    </div>

    <div class="mb-20">
      {#if link.link.state === LinkState.ACTIVE}
        <Button
          variant="outline"
          onclick={endLink}
          class="w-full h-11 border border-red-200 text-red-600 rounded-full mb-3 cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-400 hover:font-semibold transition-colors"
        >
          End link
        </Button>
        <Button
          id="copy-link-button"
          onclick={copyLink}
          class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
        >
          {showCopied ? "Copied" : "Copy link"}
        </Button>
      {/if}
      {#if link.link.state === LinkState.INACTIVE}
        <Button
          variant="outline"
          onclick={createWithdrawAction}
          class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
        >
          Withdraw
        </Button>
      {/if}
    </div>
  </div>
{/if}

{#if link.link?.state !== LinkState.INACTIVE_ENDED}
<TxCart {link} goNext={withdraw}/>
{/if}
