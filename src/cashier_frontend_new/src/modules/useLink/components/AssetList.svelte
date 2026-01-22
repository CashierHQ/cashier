<script lang="ts">
  import type { AssetInfo } from "$modules/links/types/link/asset";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import {
    formatNumber,
    formatUsdAmount,
  } from "$modules/shared/utils/formatNumber";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { getAssetWithTokenInfo } from "$modules/useLink/utils/getAssetWithTokenInfo";
  import { TokenIcon } from "$modules/imageCache";

  interface Props {
    assetInfo: AssetInfo[];
  }

  let { assetInfo }: Props = $props();

  // Get user wallet address
  const userAddress = $derived.by(() => {
    return authState.account?.owner ?? "";
  });

  const shortAddress = $derived.by(() => {
    if (!userAddress) return "";
    return transformShortAddress(userAddress);
  });

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
</script>

<div class="space-y-4 mb-4">
  <!-- First field: Receive to -->
  <div>
    <div class="flex gap-2 items-center mb-2 justify-between">
      <Label>{locale.t("links.linkForm.useLink.receiveTo")}</Label>
    </div>
    <div class="flex flex-col border-[1px] rounded-lg border-lightgreen">
      <div class="flex flex-row items-center justify-between px-4 py-3">
        <div class="flex items-center gap-1">
          <img
            src="/icpToken.png"
            alt={locale.t("links.linkForm.useLink.userAddress")}
            class="w-6 h-6"
          />
          <p class="text-sm font-normal">{shortAddress}</p>
        </div>
        <p class="text-sm text-green">
          {locale.t("links.linkForm.useLink.connected")}
        </p>
      </div>
    </div>
  </div>

  <!-- Second field: You receive -->
  <div>
    <div class="flex gap-2 items-center mb-2 justify-between">
      <Label>{locale.t("links.linkForm.useLink.youReceive")}</Label>
    </div>
    {#if assetInfo && assetInfo.length > 0}
      <div
        class="border-[1px] rounded-lg border-lightgreen px-4 py-3 flex flex-col gap-3"
      >
        {#each assetInfo as assetInfoItem (getAssetAddress(assetInfoItem) || assetInfoItem.label)}
          {@const assetData = processAssetInfo(assetInfoItem)}
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-1.5">
              <TokenIcon
                address={assetData.address}
                symbol={assetData.symbol}
                logo={assetData.logo}
                size="sm"
                {failedImageLoads}
                {onImageError}
              />
              <p class="text-[14px] font-medium">{assetData.symbol}</p>
            </div>
            <div class="flex flex-col items-end">
              <div class="flex items-center gap-1">
                <p class="text-[14px] font-normal">
                  {formatNumber(assetData.amount)}
                </p>
              </div>
              <p class="text-[10px] medium-font text-[#b6b6b6]">
                ~${formatUsdAmount(assetData.usdValue)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-sm text-muted-foreground">
        {locale.t("links.linkForm.useLink.noAssets")}
      </div>
    {/if}
  </div>
</div>
