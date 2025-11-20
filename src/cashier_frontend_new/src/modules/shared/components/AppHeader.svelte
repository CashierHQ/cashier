<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { locale } from "$lib/i18n";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import CashierLogo from "$modules/ui/components/CashierLogo.svelte";
  import { ChevronLeft } from "lucide-svelte";
  import MenuButton from "./MenuButton.svelte";
  import WalletButton from "./WalletButton.svelte";

  type Props = {
    isCreateOrEditPage?: boolean;
    linkName?: string;
  };

  let { isCreateOrEditPage = false, linkName }: Props = $props();

  function handleWalletClick() {
    // TODO: Implement wallet panel opening
    console.log("Open wallet");
  }

  // Get current path to determine if it's create or edit
  const currentPath = $derived.by(() => page.url.pathname);

  // Get display name for mobile header
  const displayName = $derived.by(() => {
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

  // Handle back button for mobile
  async function handleMobileBack() {
    await appHeaderStore.triggerBack();
  }
</script>

<div
  class="w-full flex justify-between items-center lg:px-8 px-4 py-3 sm:pt-3 pt-4 bg-white"
>
  {#if isCreateOrEditPage}
    <!-- Mobile header for create/edit pages -->
    <div class="md:hidden w-full flex items-center justify-center relative">
      <button
        onclick={handleMobileBack}
        class="absolute left-0 cursor-pointer text-[1.5rem] transition-transform hover:scale-105"
        type="button"
        aria-label={locale.t("links.linkForm.header.back")}
      >
        <ChevronLeft class="w-[25px] h-[25px]" aria-hidden="true" />
      </button>
      <h4
        class="scroll-m-20 text-lg font-semibold tracking-tight self-center transition-opacity duration-200"
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

  <div class="flex items-center">
    <WalletButton onClick={handleWalletClick} />
    <MenuButton />
  </div>
</div>
