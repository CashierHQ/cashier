<script lang="ts">
  import { locale } from "$lib/i18n";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import NftList from "$modules/wallet/components/nft/nftList.svelte";
  import TokenList from "$modules/wallet/components/token/tokenList.svelte";
  import { WalletTab } from "$modules/wallet/types";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";
  import { walletNftStore } from "../state/walletNftStore.svelte";

  type Props = {
    activeTab?: WalletTab;
    onNavigateToToken: (token: string) => void;
    onNavigateToManage: () => void;
    onNavigateToSend: () => void;
    onNavigateToReceive: () => void;
    onNavigateToSwap: () => void;
    onNavigateToAddNft: () => void;
    onTabChange: (tab: WalletTab) => void;
  };

  let {
    activeTab = WalletTab.TOKENS,
    onNavigateToToken,
    onNavigateToManage,
    onNavigateToSend,
    onNavigateToReceive,
    onNavigateToSwap,
    onNavigateToAddNft,
    onTabChange,
  }: Props = $props();

  let failedImageLoads = new SvelteSet<string>();
  let currentTab = $state<WalletTab>(activeTab);

  const BALANCE_VISIBILITY_KEY = "wallet_balance_visible";
  let balanceVisible = $state(
    typeof window !== "undefined" &&
      localStorage.getItem(BALANCE_VISIBILITY_KEY) !== null
      ? localStorage.getItem(BALANCE_VISIBILITY_KEY) === "true"
      : true,
  );

  const enabledTokens: TokenWithPriceAndBalance[] = $derived.by(() => {
    if (!walletStore.query.data) return [];
    return walletStore.query.data.filter((token) => token.enabled);
  });

  $effect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(BALANCE_VISIBILITY_KEY, String(balanceVisible));
    }
  });

  function handleToggle() {
    balanceVisible = !balanceVisible;
  }

  function handleSelectToken(address: string) {
    onNavigateToToken(address);
  }

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  function handleManageTokens() {
    onNavigateToManage();
  }

  function handleTabChange(tab: WalletTab) {
    currentTab = tab;
    onTabChange(tab);
  }

  function handleSelectNft(collectionId: string, tokenId: bigint) {
    // Handle NFT selection (e.g., navigate to NFT details)
    toast.info("Selected NFT: " + collectionId + " #" + tokenId.toString());
  }

  function handleAddNft() {
    onNavigateToAddNft();
  }

  function handleLoadMoreNfts() {
    walletNftStore.loadMore();
  }
</script>

<NavBar
  mode="default"
  activeTab={currentTab}
  isBalanceVisible={balanceVisible}
  onToggleBalance={handleToggle}
  onSend={onNavigateToSend}
  onReceive={onNavigateToReceive}
  onSwap={onNavigateToSwap}
  onTabChange={handleTabChange}
/>

<div class="px-4 pb-6">
  {#if currentTab === WalletTab.TOKENS}
    {#if walletStore.query.data}
      <TokenList
        tokens={enabledTokens}
        {balanceVisible}
        onSelectToken={handleSelectToken}
        onImageError={handleImageError}
        {failedImageLoads}
      />

      <div class="mt-6 text-center">
        <button
          onclick={handleManageTokens}
          class="text-green hover:text-teal-700 font-medium text-base transition-colors"
        >
          {locale.t("wallet.manageTokensBtn")}
        </button>
      </div>
    {:else if walletStore.query.error}
      <div class="text-center py-8">
        <p class="text-red-600 mb-4">
          {locale.t("wallet.errorMsg")}
          {walletStore.query.error}
        </p>
      </div>
    {:else}
      <div class="text-center py-8">
        <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
      </div>
    {/if}
  {:else if currentTab === WalletTab.NFTS}
    {#if walletNftStore.query.data}
      <NftList
        nfts={walletNftStore.query.data}
        hasMore={walletNftStore.hasMore}
        onSelectNFT={(collectionId, tokenId) => {
          handleSelectNft(collectionId, tokenId);
        }}
        onLoadMore={handleLoadMoreNfts}
      />

      <div class="mt-6 text-center">
        <button
          onclick={handleAddNft}
          class="text-green hover:text-teal-700 font-medium text-base transition-colors"
        >
          {locale.t("wallet.addNftBtn")}
        </button>
      </div>
    {:else if walletNftStore.query.error}
      <div class="text-center py-8">
        <p class="text-red-600 mb-4">
          {locale.t("wallet.errorMsg")}
          {walletNftStore.query.error}
        </p>
      </div>
    {/if}
  {/if}
</div>
