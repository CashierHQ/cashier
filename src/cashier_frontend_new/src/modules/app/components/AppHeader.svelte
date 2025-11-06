<script lang="ts">
  import { Wallet } from "lucide-svelte";
  import { resolve } from "$app/paths";
  import AppSidebar from "./AppSidebar.svelte";

  let isSidebarOpen = $state(false);

  function handleWalletClick() {
    // TODO: Implement wallet panel opening
    console.log("Open wallet");
  }

  function handleMenuClick() {
    isSidebarOpen = true;
  }

  function handleSidebarChange(open: boolean) {
    isSidebarOpen = open;
  }
</script>

<div
  class="w-full flex justify-between items-center lg:px-8 px-4 py-3 sm:pt-3 pt-4 bg-white"
>
  <a href={resolve("/app")}>
    <img
      alt="Cashier logo"
      class="max-w-[130px] cursor-pointer"
      src="/logo.svg"
    />
  </a>

  <div class="flex items-center">
    <button
      onclick={handleWalletClick}
      class="rounded-md inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-background shadow-sm hover:bg-accent hover:text-accent-foreground ml-auto p-0 w-9 h-9 mr-3 gap-2"
      style="border: 1px solid rgba(208, 213, 221, 0.5);"
      type="button"
      aria-label="Open wallet"
    >
      <Wallet class="w-4 h-4 text-primary" />
    </button>

    <button
      onclick={handleMenuClick}
      class="rounded-md inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9"
      style="border: 1px solid rgba(208, 213, 221, 0.5);"
      type="button"
      aria-label="Open menu"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M3 4h18" />
        <path d="M3 12h12" />
        <path d="M3 20h18" />
      </svg>
    </button>
  </div>
</div>

<AppSidebar open={isSidebarOpen} onOpenChange={handleSidebarChange} />
