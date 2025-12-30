<script lang="ts">
  import { X, LoaderCircle } from "lucide-svelte";
  import WalletPage from "$modules/wallet/pages/wallet.svelte";
  import TokenInfoPage from "$modules/wallet/pages/tokenInfo.svelte";
  import ReceivePage from "$modules/wallet/pages/receive.svelte";
  import SendPage from "$modules/wallet/pages/send.svelte";
  import ImportPage from "$modules/wallet/pages/import.svelte";
  import ManagePage from "$modules/wallet/pages/manage.svelte";
  import {
    WalletViewType,
    type WalletView,
  } from "$modules/shared/types/wallet";

  type Props = {
    open?: boolean;
  };

  let { open = $bindable(false) }: Props = $props();

  let currentView = $state<WalletView>({ type: WalletViewType.MAIN });
  let isToggling = $state(false);

  function handleClose() {
    open = false;
    currentView = { type: WalletViewType.MAIN };
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function navigateToToken(token: string) {
    currentView = { type: WalletViewType.TOKEN, token };
  }

  function navigateToSwap(token?: string) {
    // TODO: implement
    console.warn("navigateToSwap", token);
  }

  function navigateToReceive(token?: string) {
    currentView = { type: WalletViewType.RECEIVE, token };
  }

  function navigateToSend(token?: string) {
    currentView = { type: WalletViewType.SEND, token };
  }

  function navigateToImport() {
    currentView = { type: WalletViewType.IMPORT };
  }

  function navigateToManage() {
    currentView = { type: WalletViewType.MANAGE };
  }

  function navigateToMain() {
    currentView = { type: WalletViewType.MAIN };
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[30] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    onclick={handleOverlayClick}
    role="presentation"
  ></div>

  <div
    role="dialog"
    aria-describedby="wallet-description"
    aria-labelledby="wallet-title"
    data-state={open ? "open" : "closed"}
    class="fixed z-[40] gap-4 bg-white shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out inset-y-0 right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm w-full flex flex-col h-full"
    tabindex="-1"
  >
    <div class="absolute right-4 top-4 z-10">
      <button
        type="button"
        onclick={handleClose}
        class="cursor-pointer rounded-sm ring-offset-background transition-opacity disabled:pointer-events-none data-[state=open]:bg-secondary opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <X
          size={24}
          class="text-gray-500 hover:text-gray-700 transition-colors"
        />
        <span class="sr-only">Close wallet</span>
      </button>
    </div>

    <!-- Loading overlay for entire wallet -->
    {#if isToggling}
      <div
        class="absolute inset-0 bg-black/20 flex items-center justify-center z-50 rounded-r-lg"
      >
        <div class="bg-white rounded-2xl p-8 shadow-xl">
          <LoaderCircle class="h-10 w-10 text-green animate-spin" />
        </div>
      </div>
    {/if}

    <div
      class="flex-1 flex flex-col overflow-y-auto p-4 {currentView.type ===
      'main'
        ? 'pt-10'
        : ''}"
    >
      {#if currentView.type === WalletViewType.MAIN}
        <WalletPage
          onNavigateToToken={navigateToToken}
          onNavigateToManage={navigateToManage}
          onNavigateToSend={navigateToSend}
          onNavigateToReceive={navigateToReceive}
          onNavigateToSwap={navigateToSwap}
        />
      {:else if currentView.type === WalletViewType.TOKEN}
        <TokenInfoPage
          token={currentView.token}
          onNavigateBack={navigateToMain}
          onNavigateToSend={(token) => navigateToSend(token)}
          onNavigateToReceive={(token) => navigateToReceive(token)}
          onNavigateToSwap={(token) => navigateToSwap(token)}
        />
      {:else if currentView.type === WalletViewType.RECEIVE}
        <ReceivePage
          initialToken={currentView.token}
          onNavigateBack={navigateToMain}
        />
      {:else if currentView.type === WalletViewType.SEND}
        <SendPage
          initialToken={currentView.token}
          onNavigateBack={navigateToMain}
        />
      {:else if currentView.type === WalletViewType.IMPORT}
        <ImportPage
          onNavigateBack={navigateToMain}
          onNavigateToToken={navigateToToken}
        />
      {:else if currentView.type === WalletViewType.MANAGE}
        <ManagePage
          onNavigateBack={navigateToMain}
          onNavigateToImport={navigateToImport}
          bind:isToggling
        />
      {/if}
    </div>
  </div>
{/if}
