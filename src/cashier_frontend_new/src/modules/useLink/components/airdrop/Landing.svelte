<script lang="ts">
  import { locale } from "$lib/i18n";
  import { Button } from "$lib/shadcn/components/ui/button";
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import {
    tokenMetadataQuery,
    tokenRegistryQuery,
  } from "$modules/token/state/tokenStore.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import TokenRewardDisplay from "$modules/useLink/components/shared/TokenRewardDisplay.svelte";
  import { type GenericUserLinkStoreVM } from "$modules/useLink/types/viewModels/genericUserLinkStoreVM";
  import { getFirstAssetDisplayInfo } from "$modules/useLink/utils/getFirstAssetDisplayInfo";

  const {
    userLink,
    openLoginModal,
  }: {
    userLink: GenericUserLinkStoreVM;
    openLoginModal?: (payload?: {
      link_type: string;
      BE_link_id: string;
    }) => void;
  } = $props();

  // Get first asset from asset_info
  const firstAsset = $derived(userLink.link?.asset_info?.[0]);

  const tokenAddress = $derived.by(() => {
    if (!firstAsset) return "";
    return (
      firstAsset.asset.address?.toText?.() ??
      firstAsset.asset.address?.toString?.() ??
      ""
    );
  });

  // Get token from wallet store (available when logged in)
  const walletToken = $derived.by(() => {
    if (!tokenAddress) return null;
    return walletStore.query.data?.find((t) => t.address === tokenAddress);
  });

  // Fallback: fetch from token registry anonymously when not logged in
  const registryToken = $derived.by(() => {
    if (!tokenAddress || walletToken) return null;
    return tokenRegistryQuery(tokenAddress);
  });

  // Get token metadata
  const tokenMeta = $derived.by(() => {
    return tokenAddress ? tokenMetadataQuery(tokenAddress) : null;
  });

  // Get display info using utility
  const displayInfo = $derived(
    getFirstAssetDisplayInfo(
      firstAsset ?? null,
      (walletToken ?? registryToken?.data) as Parameters<
        typeof getFirstAssetDisplayInfo
      >[1],
      tokenMeta?.data ?? null,
    ),
  );

  // Get airdrop progress info
  const claimedCount = $derived(
    userLink.link?.link_use_action_counter
      ? Number(userLink.link.link_use_action_counter ?? 0n)
      : undefined,
  );

  const totalCount = $derived(
    userLink.link?.link_use_action_max_count
      ? Number(userLink.link.link_use_action_max_count ?? 1n)
      : undefined,
  );

  const isLoggedIn = $derived(userProfile.isLoggedIn());

  function handleContinueLoggedIn() {
    const link = userLink.link;
    if (link) {
      trackEvent(AnalyticsEvent.USE_LANDING_CONTINUE_LOGGED_IN, {
        link_type: link.link_type,
        BE_link_id: userLink.link?.id ?? "",
      });
    }
    userLink.goNext();
  }

  function handleContinueLoggedOut() {
    const link = userLink.link;
    if (link) {
      trackEvent(AnalyticsEvent.USE_LANDING_CONTINUE_LOGGED_OUT, {
        link_type: link.link_type,
        BE_link_id: userLink.link?.id ?? "",
      });
      openLoginModal?.({
        link_type: link.link_type,
        BE_link_id: userLink.link?.id ?? "",
      });
    } else {
      openLoginModal?.();
    }
  }
</script>

{#if displayInfo}
  <TokenRewardDisplay
    tokenAddress={displayInfo.tokenAddress}
    amount={displayInfo.amount}
    symbol={displayInfo.symbol}
    decimals={displayInfo.decimals}
    logo={displayInfo.logo}
    message={locale.t("links.linkForm.chooseType.airdropDescription")}
    {claimedCount}
    {totalCount}
  />
{/if}

{#if isLoggedIn}
  <div class="mt-4 flex gap-2 w-[95%] mx-auto">
    <Button
      variant="default"
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none h-[44px] px-4 w-full"
      onclick={handleContinueLoggedIn}
    >
      {locale.t("links.linkForm.useLink.claimButton")}
    </Button>
  </div>
{:else}
  <div class="mt-4 flex gap-2 w-[95%] mx-auto">
    <Button
      variant="default"
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none h-[44px] px-4 w-full"
      onclick={handleContinueLoggedOut}
    >
      {locale.t("links.linkForm.useLink.continueButton")}
    </Button>
  </div>
{/if}
