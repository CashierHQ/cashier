<script lang="ts">
  import AppSidebar from "./AppSidebar.svelte";
  import { locale } from "$lib/i18n";

  let isSidebarOpen = $state(false);

  function handleMenuClick() {
    isSidebarOpen = true;
  }

  function handleSidebarChange(open: boolean) {
    isSidebarOpen = open;
  }
</script>

<button
  onclick={handleMenuClick}
  class="rounded-md inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9"
  style="border: 1px solid rgba(208, 213, 221, 0.5);"
  type="button"
  aria-label={locale.t("links.menuButton.openMenu")}
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

<AppSidebar open={isSidebarOpen} onOpenChange={handleSidebarChange} />
