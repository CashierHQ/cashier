<script lang="ts">
  import { locale } from "$lib/i18n";
  import { WalletNavigationState } from "$modules/shared/state/walletNavigation.svelte";
  import { WalletViewType } from "$modules/shared/types/wallet";
  import ImportPage from "$modules/wallet/pages/import.svelte";
  import ImportNftPage from "$modules/wallet/pages/importNft.svelte";
  import ManageCollectionsPage from "$modules/wallet/pages/manageCollections.svelte";
  import ManagePage from "$modules/wallet/pages/manage.svelte";
  import ReceiveNftPage from "$modules/wallet/pages/receiveNft.svelte";
  import ReceivePage from "$modules/wallet/pages/receive.svelte";
  import SendNftPage from "$modules/wallet/pages/sendNft.svelte";
  import SendPage from "$modules/wallet/pages/send.svelte";
  import TokenInfoPage from "$modules/wallet/pages/tokenInfo.svelte";
  import WalletPage from "$modules/wallet/pages/wallet.svelte";
  import { WalletTab } from "$modules/wallet/types";
  import { LoaderCircle, X } from "lucide-svelte";

  type Props = {
    open?: boolean;
  };

  let { open = $bindable(false) }: Props = $props();

  const walletNavigation = new WalletNavigationState();
  let isToggling = $state(false);

  function handleClose() {
    open = false;
    walletNavigation.reset();
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleSwitchMainTab(tab: WalletTab) {
    walletNavigation.switchMainTab(tab);
  }

  function navigateToToken(token: string) {
    walletNavigation.navigateToToken(token);
  }

  function navigateToSwap(token?: string) {
    walletNavigation.navigateToSwap(token);
  }

  function navigateToReceive(token?: string) {
    walletNavigation.navigateToReceive(token);
  }

  function navigateToNftReceive(collectionId?: string) {
    walletNavigation.navigateToNftReceive(collectionId);
  }

  function navigateToNftSend(collectionId?: string, tokenId?: bigint) {
    walletNavigation.navigateToNftSend(collectionId, tokenId);
  }

  function navigateToSend(token?: string) {
    walletNavigation.navigateToSend(token);
  }

  function navigateToImport() {
    walletNavigation.navigateToImport();
  }

  function navigateToManage() {
    walletNavigation.navigateToManage();
  }

  function navigateToManageCollections() {
    walletNavigation.navigateToManageCollections();
  }

  function handleMainNestedViewChange(isNested: boolean) {
    walletNavigation.setMainNestedView(isNested);
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
    {#if walletNavigation.currentView.type === WalletViewType.MAIN && !walletNavigation.mainViewHasNestedPage}
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
      class="flex-1 flex flex-col overflow-y-auto p-4 {walletNavigation
        .currentView.type === WalletViewType.MAIN
        ? 'pt-0'
        : ''}"
    >
      {#if walletNavigation.currentView.type === WalletViewType.MAIN}
        <WalletPage
          activeTab={walletNavigation.currentMainTab}
          initialSelectedCollectionId={walletNavigation.currentView
            .selectedCollectionId}
          initialSelectedTokenId={walletNavigation.currentView.selectedTokenId}
          onNavigateToToken={navigateToToken}
          onNavigateToManage={navigateToManage}
          onNavigateToSend={navigateToSend}
          onNavigateToNftSend={navigateToNftSend}
          onNavigateToReceive={navigateToReceive}
          onNavigateToNftReceive={navigateToNftReceive}
          onNavigateToSwap={navigateToSwap}
          onNavigateToManageNfts={navigateToManageCollections}
          onTabChange={handleSwitchMainTab}
          onNestedViewChange={handleMainNestedViewChange}
        />
      {:else if walletNavigation.currentView.type === WalletViewType.TOKEN}
        <TokenInfoPage
          token={walletNavigation.currentView.token}
          onNavigateBack={() => walletNavigation.navigateBack()}
          onNavigateToSend={(token) => navigateToSend(token)}
          onNavigateToReceive={(token) => navigateToReceive(token)}
          onNavigateToSwap={(token) => navigateToSwap(token)}
        />
      {:else if walletNavigation.currentView.type === WalletViewType.RECEIVE}
        <ReceivePage
          initialToken={walletNavigation.currentView.token}
          onNavigateBack={() => walletNavigation.navigateBack()}
        />
      {:else if walletNavigation.currentView.type === WalletViewType.NFT_RECEIVE}
        <ReceiveNftPage
          initialCollectionId={walletNavigation.currentView.collectionId}
          onNavigateBack={() => walletNavigation.navigateBack()}
        />
      {:else if walletNavigation.currentView.type === WalletViewType.NFT_SEND}
        <SendNftPage
          initialCollectionId={walletNavigation.currentView.collectionId}
          initialTokenId={walletNavigation.currentView.tokenId}
          onNavigateBack={() => walletNavigation.navigateBack()}
        />
      {:else if walletNavigation.currentView.type === WalletViewType.SEND}
        <SendPage
          initialToken={walletNavigation.currentView.token}
          onNavigateBack={() => walletNavigation.navigateBack()}
        />
      {:else if walletNavigation.currentView.type === WalletViewType.IMPORT}
        <ImportPage
          onNavigateBack={() => walletNavigation.navigateBack()}
          onNavigateToToken={navigateToToken}
        />
      {:else if walletNavigation.currentView.type === WalletViewType.MANAGE}
        <ManagePage
          onNavigateBack={() => walletNavigation.navigateBack()}
          onNavigateToImport={navigateToImport}
          bind:isToggling
        />
      {:else if walletNavigation.currentView.type === WalletViewType.ADD_NFT}
        <ImportNftPage onNavigateBack={() => walletNavigation.navigateBack()} />
      {:else if walletNavigation.currentView.type === WalletViewType.MANAGE_COLLECTIONS}
        <ManageCollectionsPage
          onNavigateBack={() => walletNavigation.navigateBack()}
        />
      {/if}
    </div>
  </div>
{/if}
