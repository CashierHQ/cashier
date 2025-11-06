<script lang="ts">
  import { X, Link, Compass, AlignLeft, CircleHelp, Wallet, Copy } from "lucide-svelte";
  import { appLinks } from "$modules/shared/constants/links";
  import { toast } from "svelte-sonner";
  import DisconnectModal from "./DisconnectModal.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";

  type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };

  let { open, onOpenChange }: Props = $props();

  let disconnectModalOpen = $state(false);

  // Get user principal from auth state
  const userPrincipal = $derived(
    authState.account?.owner ? transformShortAddress(authState.account.owner) : "Not connected"
  );

  function handleClose() {
    onOpenChange(false);
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  async function handleCopyPrincipal() {
    try {
      const fullPrincipal = authState.account?.owner || "";
      await navigator.clipboard.writeText(fullPrincipal);
      toast.success("Address copied");
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  function handleDisconnect() {
    handleClose();
    disconnectModalOpen = true;
  }

  function handleDisconnectConfirm() {
    handleClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-40 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    onclick={handleOverlayClick}
    role="presentation"
  ></div>

  <div
    role="dialog"
    aria-describedby="sidebar-description"
    aria-labelledby="sidebar-title"
    data-state={open ? "open" : "closed"}
    class="fixed z-[60] gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out inset-y-0 right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm w-full p-4 flex flex-col h-full"
    tabindex="-1"
  >
    <button
      type="button"
      onclick={handleClose}
      class="absolute right-4 top-6 cursor-pointer rounded-sm ring-offset-background transition-opacity disabled:pointer-events-none data-[state=open]:bg-secondary opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <X class="h-6 w-6" />
      <span class="sr-only">Close</span>
    </button>

    <!-- Header -->
    <div class="flex flex-col space-y-2 text-center sm:text-left">
      <h2 id="sidebar-title" class="text-lg font-semibold text-foreground mb-2">
        <img alt="Cashier logo" class="max-w-[130px]" src="/logo.svg" />
      </h2>

      <!-- Menu items -->
      <div class="w-full flex flex-col flex-grow mt-2">
        <a
          href={appLinks.about.url}
          target="_blank"
          rel="noopener noreferrer"
          class="w-full font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors group hover:text-green hover:cursor-pointer hover:bg-lightgreen focus:bg-accent focus:text-accent-foreground"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <span class="w-8 text-grey group-hover:text-green">
                <Link class="w-[22px] h-[22px]" />
              </span>
              <span class="text-[16px] font-semibold text-[#222] group-hover:text-green">
                {appLinks.about.label}
              </span>
            </div>
          </div>
        </a>

        <a
          href={appLinks.exploreCashier.url}
          target="_blank"
          rel="noopener noreferrer"
          class="w-full font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors group hover:text-green hover:cursor-pointer hover:bg-lightgreen focus:bg-accent focus:text-accent-foreground"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <span class="w-8 text-grey group-hover:text-green">
                <Compass class="w-[22px] h-[22px]" />
              </span>
              <span class="text-[16px] font-semibold text-[#222] group-hover:text-green">
                {appLinks.exploreCashier.label}
              </span>
            </div>
          </div>
        </a>

        <a
          href={appLinks.projectOverview.url}
          target="_blank"
          rel="noopener noreferrer"
          class="w-full font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors group hover:text-green hover:cursor-pointer hover:bg-lightgreen focus:bg-accent focus:text-accent-foreground"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <span class="w-8 text-grey group-hover:text-green">
                <AlignLeft class="w-[22px] h-[22px]" />
              </span>
              <span class="text-[16px] font-semibold text-[#222] group-hover:text-green">
                {appLinks.projectOverview.label}
              </span>
            </div>
          </div>
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-auto">
      <div class="flex flex-col w-full">
        <div class="w-full flex flex-col flex-grow">
          <a
            href={appLinks.faq.url}
            target="_blank"
            rel="noopener noreferrer"
            class="w-full font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors group hover:text-green hover:cursor-pointer hover:bg-lightgreen focus:bg-accent focus:text-accent-foreground"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <span class="w-8 text-grey group-hover:text-green">
                  <CircleHelp class="w-[22px] h-[22px]" />
                </span>
                <span class="text-[16px] font-semibold text-[#222] group-hover:text-green">
                  {appLinks.faq.label}
                </span>
              </div>
            </div>
          </a>
        </div>

        <div
          data-orientation="horizontal"
          role="none"
          class="shrink-0 bg-border h-[1px] w-full mb-4 mt-2 max-w-full mx-auto opacity-50"
        ></div>

        <!-- Wallet info -->
        <div class="w-full font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors mt-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <span class="w-8 text-grey">
                <Wallet class="w-[22px] h-[22px]" />
              </span>
              <span class="text-[16px] font-semibold text-[#222]">{userPrincipal}</span>
            </div>
            <button
              onclick={(e) => {
                e.stopPropagation();
                handleCopyPrincipal();
              }}
              class="text-grey hover:text-green transition-colors cursor-pointer"
              type="button"
              aria-label="Copy principal"
            >
              <Copy class="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>

        <button
          onclick={handleDisconnect}
          class="w-[95%] border border-[#D26060] cursor-pointer mx-auto text-[#D26060] flex items-center justify-center rounded-full font-semibold text-[14px] h-[44px] mt-4 hover:bg-[#D26060] hover:text-white transition-colors"
          type="button"
        >
          Disconnect
        </button>
      </div>
    </div>
  </div>
{/if}

<DisconnectModal
  open={disconnectModalOpen}
  onOpenChange={(value) => {
    disconnectModalOpen = value;
  }}
  onConfirm={handleDisconnectConfirm}
/>

