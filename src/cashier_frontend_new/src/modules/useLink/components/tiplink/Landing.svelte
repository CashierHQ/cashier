<script lang="ts">
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { Button } from "$lib/shadcn/components/ui/button";
  import { locale } from "$lib/i18n";
  import TokenRewardDisplay from "../shared/TokenRewardDisplay.svelte";
  import { getFirstAssetDisplayInfo } from "../../utils/getFirstAssetDisplayInfo";

  const {
    userLink,
    openLoginModal,
  }: {
    userLink: UserLinkStore;
    openLoginModal?: () => void;
  } = $props();

  // Get first asset from asset_info
  const firstAsset = $derived.by(() => {
    return userLink.linkDetail?.link?.asset_info?.[0];
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

  const isLoggedIn = $derived(userProfile.isLoggedIn());
</script>

{#if userLink.linkDetail?.query.isLoading}
  {locale.t("links.linkForm.useLink.loading")}
{/if}

{#if displayInfo}
  <TokenRewardDisplay
    tokenAddress={displayInfo.tokenAddress}
    amount={displayInfo.amount}
    symbol={displayInfo.symbol}
    decimals={displayInfo.decimals}
    message={locale.t("links.linkForm.useLink.completed.message")}
  />
{/if}

{#if isLoggedIn}
  <div class="mt-4 flex gap-2 w-[95%] mx-auto">
    <Button
      variant="default"
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none h-[44px] px-4 w-full"
      onclick={() => userLink.goNext()}
    >
      {locale.t("links.linkForm.useLink.claimButton")}
    </Button>
  </div>
{:else}
  <div class="mt-4 flex gap-2 w-[95%] mx-auto">
    <Button
      variant="default"
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none h-[44px] px-4 w-full"
      onclick={openLoginModal}
    >
      {locale.t("links.linkForm.useLink.continueButton")}
    </Button>
  </div>
{/if}
