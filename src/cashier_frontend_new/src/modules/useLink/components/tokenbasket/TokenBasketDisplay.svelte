<script lang="ts">
  import type { AssetInfo } from "$modules/links/types/link/asset";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { getAssetWithTokenInfo } from "$modules/useLink/utils/getAssetWithTokenInfo";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import { SvelteSet } from "svelte/reactivity";
  import { locale } from "$lib/i18n";

  const {
    assets,
    message,
  }: {
    assets: AssetInfo[];
    message?: string;
  } = $props();

  // Track failed image loads
  let failedImageLoads = new SvelteSet<string>();

  function onImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Extract address from asset (helper to avoid duplication)
  function getAssetAddress(assetInfoItem: AssetInfo): string {
    return (
      assetInfoItem.asset.address?.toText?.() ??
      assetInfoItem.asset.address?.toString?.() ??
      ""
    );
  }

  // Process assets to get token info using utility function
  function processAssetInfo(assetInfoItem: AssetInfo) {
    const address = getAssetAddress(assetInfoItem);

    const walletToken = walletStore.query.data?.find(
      (t) => t.address === address,
    );
    const tokenMetaState = address ? tokenMetadataQuery(address) : null;
    const tokenMeta = tokenMetaState?.data;

    return getAssetWithTokenInfo(assetInfoItem, walletToken, tokenMeta);
  }

  const displayMessage = $derived(
    message ?? locale.t("links.linkForm.useLink.completed.tokenBasketMessage"),
  );
</script>

{#if assets && assets.length > 0}
  <div class="flex flex-col items-center w-full">
    <!-- Token list with white background -->
    <div
      class="w-full bg-white rounded-xl p-7 mb-4 flex flex-col gap-3 max-w-[220px] min-w-[200px] mx-auto mt-20 mb-4"
    >
      {#each assets as assetInfoItem (getAssetAddress(assetInfoItem) || assetInfoItem.label)}
        {@const assetData = processAssetInfo(assetInfoItem)}
        <div class="flex items-center gap-2 overflow-x-hidden">
          <!-- Token icon or first letter -->
          {#if !failedImageLoads.has(assetData.address)}
            <img
              src={assetData.logo}
              alt={assetData.symbol}
              class="w-6 h-6 rounded-full object-contain"
              onerror={() => onImageError(assetData.address)}
            />
          {:else}
            <div
              class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600"
            >
              {assetData.symbol[0]?.toUpperCase() ?? "?"}
            </div>
          {/if}
          <!-- Amount and symbol -->
          <div class="flex-1 text-left">
            <div class="text-[14px] font-semibold text-gray-900">
              {formatNumber(assetData.amount, {
                tofixed: assetData.decimals,
              })}
              {assetData.symbol}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Congratulations message -->
    <div
      class="text-center text-gray-600 text-[14px] font-normal leading-[120%] mb-8 max-w-[180px] pt-2"
    >
      {displayMessage}
    </div>
  </div>
{/if}
