<script lang="ts">
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
  import { Button } from "$lib/shadcn/components/ui/button";
  import { locale } from "$lib/i18n";
  import TokenBasketDisplay from "$modules/useLink/components/tokenbasket/TokenBasketDisplay.svelte";

  const {
    userLink,
    openLoginModal,
  }: {
    userLink: UserLinkStore;
    openLoginModal?: () => void;
  } = $props();

  // Get all assets from asset_info
  const assets = $derived(userLink.linkDetail?.link?.asset_info ?? []);

  const isLoggedIn = $derived(userProfile.isLoggedIn());
</script>

{#if userLink.linkDetail?.query.isLoading}
  {locale.t("links.linkForm.useLink.loading")}
{/if}

{#if assets && assets.length > 0}
  <TokenBasketDisplay {assets} />
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
