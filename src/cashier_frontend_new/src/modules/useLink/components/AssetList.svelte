<script lang="ts">
  import type { AssetInfo } from "$modules/links/types/link/asset";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import {
    formatNumber,
    formatUsdAmount,
  } from "$modules/shared/utils/formatNumber";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { SvelteSet } from "svelte/reactivity";

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

  // Process assets to get token info
  function getAssetWithTokenInfo(assetInfoItem: AssetInfo) {
    const address =
      assetInfoItem.asset.address?.toText?.() ??
      assetInfoItem.asset.address?.toString?.() ??
      "";

    const walletToken = walletStore.query.data?.find(
      (t) => t.address === address,
    );
    const tokenMeta = address ? tokenMetadataQuery(address) : null;

    const symbol =
      walletToken?.symbol ??
      tokenMeta?.data?.symbol ??
      assetInfoItem.label ??
      "TOKEN";

    const decimals = walletToken?.decimals ?? tokenMeta?.data?.decimals ?? 8;

    const priceUSD = walletToken?.priceUSD;

    const amount = parseBalanceUnits(
      assetInfoItem.amount_per_link_use_action,
      decimals,
    );

    const usdValue = priceUSD ? amount * priceUSD : 0;

    const logo = getTokenLogo(address);

    return {
      address,
      amount,
      symbol,
      decimals,
      priceUSD,
      usdValue,
      logo,
    };
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
        {#each assetInfo as assetInfoItem (assetInfoItem.asset.address?.toText?.() ?? assetInfoItem.label)}
          {@const assetData = getAssetWithTokenInfo(assetInfoItem)}
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-1.5">
              {#if !failedImageLoads.has(assetData.address)}
                <img
                  src={assetData.logo}
                  alt={assetData.symbol}
                  class="w-5 h-5 rounded-full overflow-hidden"
                  onerror={() => onImageError(assetData.address)}
                />
              {:else}
                <div
                  class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden"
                >
                  {assetData.symbol[0]?.toUpperCase() || "?"}
                </div>
              {/if}
              <p class="text-[14px] font-medium">{assetData.symbol}</p>
            </div>
            <div class="flex flex-col items-end">
              <div class="flex items-center gap-1">
                <p class="text-[14px] font-normal">
                  {formatNumber(assetData.amount)}
                </p>
              </div>
              <p class="text-[10px] medium-font text-[#b6b6b6]">
                {formatUsdAmount(assetData.usdValue)}
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
