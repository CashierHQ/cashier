<script lang="ts">
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { locale } from "$lib/i18n";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import CashierLogo from "$modules/ui/components/CashierLogo.svelte";
  import { ChevronLeft } from "lucide-svelte";
  import MenuButton from "./MenuButton.svelte";
  import WalletButton from "./WalletButton.svelte";
  import { userProfile } from "../services/userProfile.svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";

  type Props = {
    isCreateOrEditPage?: boolean;
    linkName?: string;
  };

  let { isCreateOrEditPage = false, linkName }: Props = $props();

  function handleWalletClick() {
    goto(resolve("/wallet"));
  }

  // Get current path to determine if it's create or edit
  const currentPath = $derived.by(() => page.url.pathname);

  // Try to get guard context (may not exist if not wrapped in RouteGuard)
  const guardContext = $derived.by(() => {
    try {
      return getGuardContext();
    } catch {
      // Context doesn't exist, which is fine for pages without RouteGuard
      return null;
    }
  });

  // Get userLinkStore from context if available
  const userLinkStore = $derived.by(() => guardContext?.userLinkStore ?? null);

  // Get current user link step
  const userLinkStep = $derived.by(() => userLinkStore?.step ?? null);

  // Check if we're on /use page
  const isUsePage = $derived.by(() => currentPath?.endsWith("/use") ?? false);

  // Get display name for mobile header
  const displayName = $derived.by(() => {
    // If path ends with /use, don't show any text
    if (isUsePage) return "";

    if (linkName) return linkName;

    // Then check if headerName is set in store
    const storeHeaderName = appHeaderStore.getHeaderName();
    if (storeHeaderName) return storeHeaderName;

    if (!isCreateOrEditPage) return "";

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

  // Handle back button for mobile
  async function handleMobileBack() {
    if (
      isUsePage &&
      userLinkStep === UserLinkStep.ADDRESS_UNLOCKED &&
      userLinkStore
    ) {
      await userLinkStore.goBack();
    } else {
      await appHeaderStore.triggerBack();
    }
  }
</script>

<div
  class="w-full flex justify-between items-center lg:px-8 px-4 py-3 sm:pt-3 pt-4 bg-white"
>
  {#if isCreateOrEditPage}
    <!-- Mobile header for create/edit pages -->
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
          <CashierLogo href={resolve("/links")} />
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
      <CashierLogo href={resolve("/links")} />
    </div>
  {:else}
    <!-- Default header with logo -->
    <CashierLogo href={resolve("/links")} />
  {/if}

  {#if userProfile.isLoggedIn()}
    <div class="flex items-center py-px">
      <WalletButton onClick={handleWalletClick} />
      <MenuButton />
    </div>
  {/if}
</div>
