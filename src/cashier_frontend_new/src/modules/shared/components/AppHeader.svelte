<script lang="ts">
  import CashierLogo from "$modules/ui/components/CashierLogo.svelte";
  import WalletButton from "./WalletButton.svelte";
  import MenuButton from "./MenuButton.svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { ChevronLeft } from "lucide-svelte";
  import { locale } from "$lib/i18n";

  type Props = {
    isCreateOrEditPage?: boolean;
    linkName?: string;
    onBack?: () => void | Promise<void>;
  };

  let { isCreateOrEditPage = false, linkName, onBack }: Props = $props();

  function handleWalletClick() {
    // TODO: Implement wallet panel opening
    console.log("Open wallet");
  }

  // Get current path to determine if it's create or edit
  const currentPath = $derived.by(() => page.url.pathname);

  // Get display name for mobile header
  const displayName = $derived(
    linkName ||
      (isCreateOrEditPage
        ? currentPath?.startsWith("/link/create")
          ? locale.t("links.linkForm.header.linkName")
          : locale.t("links.linkForm.header.editLink")
        : ""),
  );

  // Handle back button for mobile
  async function handleMobileBack() {
    if (onBack) {
      await onBack();
    } else {
      goto(resolve("/links"));
    }
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
