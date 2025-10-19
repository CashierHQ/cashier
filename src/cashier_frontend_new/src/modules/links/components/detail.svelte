<script lang="ts">
  import { linkQuery } from "../state/link.svelte";
  import { ActionType } from "../types/action/actionType";
  import { cashierBackendService } from "../services/cashierBackend";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { ChevronLeft } from "lucide-svelte";
  import { statusBadge } from "../utils/statusBadge";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";

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

  const {
    id,
  }: {
    id: string;
  } = $props();

  let link = linkQuery(id, ActionType.Withdraw);
  console.log("link detail", link);
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
      if (!link || !link.data) return;
      const id = link.data.link.id;
      // call service with plain object; service will handle typing
      await cashierBackendService.updateLink({
        id,
        goto: { Back: null },
      } as any);
      // managedState exposes refresh()
      link.refresh();
    } catch (err) {
      console.error("end link failed", err);
    }
  };
</script>

{#if link.isLoading}
  Loading...
{/if}
{#if link?.data?.link}
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
        {link.data.link.title}
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
            <span class={`${statusBadge(link.data.link.state).classes}`}>
              {statusBadge(link.data.link.state).text}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">Type</div>
          <div class="font-medium">{link.data.link.link_type.id}</div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">User pays</div>
          <div class="font-medium">-</div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">User claims</div>
          <div class="font-medium">
            {#if link.data.link.asset_info && link.data.link.asset_info.length > 0}
              <div class="flex gap-2 flex-wrap">
                {#each link.data.link.asset_info as assetInfo (assetInfo.label + String(assetInfo.amount_per_link_use_action))}
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
            {String(link.data.link.link_use_action_max_count)}
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
            {#if link.data.link.asset_info && link.data.link.asset_info.length > 0}
              {link.data.link.asset_info[0].label}
            {:else}
              Empty
            {/if}
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">Used</div>
          <div class="font-medium">
            {String(link.data.link.link_use_action_counter)}
          </div>
        </div>
      </div>
    </div>

    <div class="mb-20">
      {#if link.data.link.state?.id === "ACTIVE"}
        <Button
          variant="outline"
          onclick={endLink}
          class="w-full h-11 border border-red-200 text-red-600 rounded-full mb-3 cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-400 hover:font-semibold transition-colors"
        >
          End link
        </Button>
      {/if}
      <Button
        id="copy-link-button"
        onclick={copyLink}
        class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
      >
        {showCopied ? "Copied" : "Copy link"}
      </Button>
    </div>
  </div>
{/if}
