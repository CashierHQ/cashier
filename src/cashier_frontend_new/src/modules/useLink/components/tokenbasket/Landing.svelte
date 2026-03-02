<script lang="ts">
  import { locale } from "$lib/i18n";
  import { Button } from "$lib/shadcn/components/ui/button";
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import TokenBasketDisplay from "$modules/useLink/components/tokenbasket/TokenBasketDisplay.svelte";
  import { type GenericUserLinkStoreVM } from "$modules/useLink/types/viewModels/genericUserLinkStoreVM";

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

  // Get all assets from asset_info
  const assets = $derived(userLink.link?.asset_info ?? []);

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

{#if assets && assets.length > 0}
  <TokenBasketDisplay {assets} />
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
