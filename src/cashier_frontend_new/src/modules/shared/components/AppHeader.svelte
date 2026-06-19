<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { locale } from "$lib/i18n";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { paths } from "$modules/routing/paths";
  import { getRouteContext } from "$modules/routing/state/routeContext.svelte";
  import MenuButton from "$modules/shared/components/MenuButton.svelte";
  import WalletButton from "$modules/shared/components/WalletButton.svelte";
  import WalletDrawer from "$modules/shared/components/WalletDrawer.svelte";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import CashierLogo from "$modules/ui/components/CashierLogo.svelte";
  import { ChevronLeft, X } from "lucide-svelte";

  type Props = {
    isLinkFormPage?: boolean;
    linkName?: string;
    class?: string;
  };

  let { isLinkFormPage = false, linkName, class: className }: Props = $props();

  let walletDrawerOpen = $state(false);

  function handleWalletClick() {
    walletDrawerOpen = true;
  }

  // Get current path to determine if it's create or edit
  const currentPath = $derived.by(() => page.url.pathname);

  // Try to get route context (it only exists on link routes).
  const routeContext = $derived.by(() => {
    try {
      return getRouteContext();
    } catch {
      // Context does not exist on routes that do not initialize link data.
      return null;
    }
  });

  // Get userLinkStoreV3 from context if available
  const userLinkStore = $derived.by(
    () => routeContext?.userLinkStoreV3 ?? null,
  );

  // Get current user link step
  const userLinkStep = $derived(userLinkStore?.step ?? null);

  // Check if we're on /use page
  const isUsePage = $derived(currentPath?.endsWith("/use") ?? false);

  const isWalletPage = $derived(currentPath?.startsWith("/wallet") ?? false);

  const isLoggedIn = $derived(userProfile.isLoggedIn());

  // Get display name for mobile header
  const displayName = $derived.by(() => {
    // If path ends with /use, don't show any text
    if (isUsePage) return "";

    if (linkName) return linkName;

    // Then check if headerName is set in store
    const storeHeaderName = appHeaderStore.getHeaderName();
    if (storeHeaderName) return storeHeaderName;

    if (!isLinkFormPage) return "";

    if (currentPath?.startsWith("/link/create")) {
      return locale.t("links.linkForm.header.linkName");
    }

    return locale.t("links.linkForm.header.editLink");
  });

  // Determine if back button should be shown
  const showBackButton = $derived.by(() => {
    if (!isUsePage) return true;
    // On LANDING step, don't show back button (show empty span)
    // On ADDRESS_UNLOCKED step, show back button
    return userLinkStep === UserLinkStep.ADDRESS_UNLOCKED;
  });

  // Handle back button for mobile (delegates to appHeaderStore back handler)
  async function handleMobileBack() {
    await appHeaderStore.triggerBack();
  }

  // Handle logo click - always returns to the public home page.
  async function handleLogoClick() {
    await goto(resolve(paths.home()));
  }
</script>

<div
  class="w-full flex justify-between items-center lg:px-8 px-4 py-3 sm:pt-3 pt-4 bg-white {className}"
>
  {#if isLinkFormPage}
    <!-- Mobile header for link form pages (create, detail, use) -->
    <div class="md:hidden w-full flex items-center justify-center relative">
      {#if showBackButton}
        <button
          onclick={handleMobileBack}
          class="absolute left-0 cursor-pointer text-[1.5rem] transition-transform hover:scale-105"
          type="button"
          aria-label={locale.t("links.linkForm.header.back")}
        >
          <ChevronLeft class="w-[25px] h-[25px]" aria-hidden="true" />
        </button>
      {:else}
        <div class="mr-auto">
          <CashierLogo onclick={handleLogoClick} />
        </div>
      {/if}
      <h4
        class="scroll-m-20 text-lg font-semibold tracking-tight self-center transition-opacity duration-200 max-w-[70%] whitespace-nowrap overflow-hidden text-ellipsis text-center"
      >
        {displayName}
      </h4>
    </div>
    <!-- Desktop: show logo -->
    <div class="hidden md:block">
      <CashierLogo onclick={handleLogoClick} />
    </div>
  {:else}
    <!-- Default header with logo -->
    <CashierLogo onclick={handleLogoClick} />
  {/if}

  {#if isLoggedIn && !isWalletPage}
    <div class="flex items-center py-px">
      <WalletButton onClick={handleWalletClick} />
      <MenuButton />
    </div>
  {:else if isWalletPage}
    <button onclick={() => goto(resolve(paths.links()))}>
      <X class="h-6 w-6" />
    </button>
  {/if}
</div>

<WalletDrawer bind:open={walletDrawerOpen} />
