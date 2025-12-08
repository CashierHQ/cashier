<script lang="ts">
  import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { Button } from "$lib/shadcn/components/ui/button";
  import { locale } from "$lib/i18n";
  import TokenRewardDisplay from "../shared/TokenRewardDisplay.svelte";
  import { getFirstAssetDisplayInfo } from "../../utils/getFirstAssetDisplayInfo";

  const { linkDetail }: { linkDetail?: LinkDetailStore } = $props();

  // Get first asset from asset_info
  const firstAsset = $derived.by(() => {
    return linkDetail?.link?.asset_info?.[0];
  });

  // Get token from wallet store
  const walletToken = $derived.by(() => {
    if (!firstAsset) return null;
    const tokenAddress =
      firstAsset.asset.address?.toText?.() ??
      firstAsset.asset.address?.toString?.() ??
      "";
    if (!tokenAddress) return null;
    return walletStore.query.data?.find((t) => t.address === tokenAddress);
  });

  // Get token metadata
  const tokenMeta = $derived.by(() => {
    if (!firstAsset) return null;
    const tokenAddress =
      firstAsset.asset.address?.toText?.() ??
      firstAsset.asset.address?.toString?.() ??
      "";
    return tokenAddress ? tokenMetadataQuery(tokenAddress) : null;
  });

  // Get display info using utility
  const displayInfo = $derived.by(() => {
    return getFirstAssetDisplayInfo(
      firstAsset ?? null,
      walletToken ?? null,
      tokenMeta?.data ?? null,
    );
  });
</script>

{#if linkDetail?.query.isLoading}
  {locale.t("links.linkForm.detail.loading")}
{/if}

{#if displayInfo}
  <TokenRewardDisplay
    tokenAddress={displayInfo.tokenAddress}
    amount={displayInfo.amount}
    symbol={displayInfo.symbol}
    message={locale.t("links.linkForm.useLink.completed.message")}
  />
{/if}

<div class="mt-4 flex gap-2 w-[95%] mx-auto">
  <Button
    variant="default"
    class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:!bg-white disabled:!text-[#36A18B] h-[44px] px-4 w-full"
    disabled={true}
  >
    {locale.t("links.linkForm.useLink.completed.claimedButton")}
  </Button>
</div>
