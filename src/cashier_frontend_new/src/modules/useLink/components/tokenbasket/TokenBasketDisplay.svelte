<script lang="ts">
  import { locale } from "$lib/i18n";
  import { TokenIcon } from "$modules/imageCache";
  import type { AssetInfo } from "$modules/links/types/link/asset";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { getAssetWithTokenInfo } from "$modules/useLink/utils/getAssetWithTokenInfo";
  import { SvelteSet } from "svelte/reactivity";

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

  function formatAssetAmount(assetData: ReturnType<typeof processAssetInfo>) {
    return formatNumber(assetData.amount, {
      tofixed: assetData.decimals,
    });
  }
</script>

{#if assets && assets.length > 0}
  <div class="flex flex-col items-center w-full">
    <!-- Token list with white background -->
    <div
      class="w-full bg-white rounded-xl p-7 mb-4 flex flex-col gap-3 max-w-[220px] min-w-[200px] mx-auto mt-20 mb-4"
    >
      {#each assets as assetInfoItem (getAssetAddress(assetInfoItem) || assetInfoItem.label)}
        {@const assetData = processAssetInfo(assetInfoItem)}
        {@const formattedAssetAmount = formatAssetAmount(assetData)}
        {@const formattedAssetValue = `${formattedAssetAmount} ${assetData.symbol}`}
        <div class="flex min-w-0 items-center gap-2 overflow-hidden">
          <!-- Token icon or first letter -->
          <TokenIcon
            address={assetData.address}
            symbol={assetData.symbol}
            logo={assetData.logo}
            size="md"
            {failedImageLoads}
            {onImageError}
            class="shrink-0 object-contain"
          />
          <!-- Amount and symbol -->
          <div class="min-w-0 flex-1 text-left">
            <div
              class="flex min-w-0 items-baseline gap-1 text-[14px] font-semibold text-gray-900"
              title={formattedAssetValue}
            >
              <span class="min-w-0 truncate">{formattedAssetAmount}</span>
              <span class="shrink-0">{assetData.symbol}</span>
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
