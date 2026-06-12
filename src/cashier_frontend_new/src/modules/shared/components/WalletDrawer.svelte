<script lang="ts">
  import { locale } from "$lib/i18n";
  import {
    WalletViewType,
    type WalletView,
  } from "$modules/shared/types/wallet";
  import ImportPage from "$modules/wallet/pages/import.svelte";
  import ImportNftPage from "$modules/wallet/pages/importNft.svelte";
  import ManageCollectionsPage from "$modules/wallet/pages/manageCollections.svelte";
  import ManagePage from "$modules/wallet/pages/manage.svelte";
  import ReceiveNftPage from "$modules/wallet/pages/receiveNft.svelte";
  import ReceivePage from "$modules/wallet/pages/receive.svelte";
  import SendPage from "$modules/wallet/pages/send.svelte";
  import TokenInfoPage from "$modules/wallet/pages/tokenInfo.svelte";
  import WalletPage from "$modules/wallet/pages/wallet.svelte";
  import { WalletTab } from "$modules/wallet/types";
  import { LoaderCircle, X } from "lucide-svelte";

  type Props = {
    open?: boolean;
  };

  let { open = $bindable(false) }: Props = $props();

  let currentView = $state<WalletView>({ type: WalletViewType.MAIN });
  let currentMainTab = $state<WalletTab>(WalletTab.TOKENS);
  let mainViewHasNestedPage = $state(false);
  let isToggling = $state(false);

  function handleClose() {
    open = false;
    currentView = { type: WalletViewType.MAIN };
    mainViewHasNestedPage = false;
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleSwitchMainTab(tab: WalletTab) {
    currentMainTab = tab;
    mainViewHasNestedPage = false;
  }

  function navigateToToken(token: string) {
    currentView = { type: WalletViewType.TOKEN, token };
    mainViewHasNestedPage = false;
  }

  function navigateToSwap(_token?: string) {
    currentView = { type: WalletViewType.MAIN };
    mainViewHasNestedPage = false;
  }

  function navigateToReceive(token?: string) {
    currentView = { type: WalletViewType.RECEIVE, token };
    mainViewHasNestedPage = false;
  }

  function navigateToNftReceive(collectionId?: string) {
    currentView = { type: WalletViewType.NFT_RECEIVE, collectionId };
    mainViewHasNestedPage = false;
  }

  function navigateToSend(token?: string) {
    currentView = { type: WalletViewType.SEND, token };
    mainViewHasNestedPage = false;
  }

  function navigateToImport() {
    currentView = { type: WalletViewType.IMPORT };
    mainViewHasNestedPage = false;
  }

  function navigateToManage() {
    currentView = { type: WalletViewType.MANAGE };
    mainViewHasNestedPage = false;
  }

  function navigateToMain() {
    currentView = { type: WalletViewType.MAIN };
    currentMainTab = WalletTab.TOKENS;
    mainViewHasNestedPage = false;
  }

  function navigateToAddNft() {
    currentView = { type: WalletViewType.ADD_NFT };
    mainViewHasNestedPage = false;
  }

  function navigateToManageCollections() {
    currentView = { type: WalletViewType.MANAGE_COLLECTIONS };
    mainViewHasNestedPage = false;
  }

  function navigateToMainNft() {
    currentView = { type: WalletViewType.MAIN };
    currentMainTab = WalletTab.NFTS;
    mainViewHasNestedPage = false;
  }

  function handleMainNestedViewChange(isNested: boolean) {
    mainViewHasNestedPage = isNested;
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
    {#if currentView.type === WalletViewType.MAIN && !mainViewHasNestedPage}
      <div class="flex items-center justify-between px-4 py-4">
        <img
          alt={locale.t("wallet.drawer.logoAlt")}
          class="max-w-[130px]"
          src="/logo.svg"
        />
        <button
          type="button"
          onclick={handleClose}
          class="cursor-pointer rounded-sm ring-offset-background transition-opacity disabled:pointer-events-none data-[state=open]:bg-secondary opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X
            size={28}
            class="text-black transition-colors hover:text-gray-700"
          />
          <span class="sr-only">{locale.t("wallet.drawer.close")}</span>
        </button>
      </div>
    {/if}

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
      WalletViewType.MAIN
        ? 'pt-0'
        : ''}"
    >
      {#if currentView.type === WalletViewType.MAIN}
        <WalletPage
          activeTab={currentMainTab}
          onNavigateToToken={navigateToToken}
          onNavigateToManage={navigateToManage}
          onNavigateToSend={navigateToSend}
          onNavigateToReceive={navigateToReceive}
          onNavigateToNftReceive={navigateToNftReceive}
          onNavigateToSwap={navigateToSwap}
          onNavigateToManageNfts={navigateToManageCollections}
          onTabChange={handleSwitchMainTab}
          onNestedViewChange={handleMainNestedViewChange}
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
      {:else if currentView.type === WalletViewType.NFT_RECEIVE}
        <ReceiveNftPage
          initialCollectionId={currentView.collectionId}
          onNavigateBack={navigateToMainNft}
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
      {:else if currentView.type === WalletViewType.ADD_NFT}
        <ImportNftPage onNavigateBack={navigateToMainNft} />
      {:else if currentView.type === WalletViewType.MANAGE_COLLECTIONS}
        <ManageCollectionsPage onNavigateBack={navigateToMainNft} />
      {/if}
    </div>
  </div>
{/if}
