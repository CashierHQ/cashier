<script lang="ts">
  import { locale } from "$lib/i18n";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import WalletOverviewHeader from "$modules/wallet/components/header/WalletOverviewHeader.svelte";
  import NftCollectionDetail from "$modules/wallet/components/nft/nftCollectionDetail.svelte";
  import NftList from "$modules/wallet/components/nft/nftList.svelte";
  import TokenList from "$modules/wallet/components/token/tokenList.svelte";
  import { WalletTab } from "$modules/wallet/types";
  import { SvelteSet } from "svelte/reactivity";
  import { walletNftStore } from "$modules/wallet/state/walletNftStore.svelte";
  import {
    getNftCollectionSummaries,
    getNftsForCollection,
  } from "$modules/wallet/utils/nftCollections";

  type Props = {
    activeTab?: WalletTab;
    onNavigateToToken: (token: string) => void;
    onNavigateToManage: () => void;
    onNavigateToSend: () => void;
    onNavigateToReceive: () => void;
    onNavigateToNftReceive: (collectionId?: string) => void;
    onNavigateToSwap: () => void;
    onNavigateToManageNfts: () => void;
    onTabChange: (tab: WalletTab) => void;
  };

  let {
    activeTab = WalletTab.TOKENS,
    onNavigateToToken,
    onNavigateToManage,
    onNavigateToSend,
    onNavigateToReceive,
    onNavigateToNftReceive,
    onNavigateToSwap,
    onNavigateToManageNfts,
    onTabChange,
  }: Props = $props();

  let failedImageLoads = new SvelteSet<string>();
  let selectedCollectionId = $state<string | null>(null);

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

  const visibleNfts = $derived.by(() =>
    (walletNftStore.query.data ?? []).filter((nft) =>
      walletNftStore.isCollectionEnabled(nft.collectionId),
    ),
  );
  const collectionCount = $derived(
    new Set(visibleNfts.map((nft) => nft.collectionId)).size,
  );
  const nftCollections = $derived(getNftCollectionSummaries(visibleNfts));
  const selectedCollection = $derived(
    selectedCollectionId
      ? (nftCollections.find(
          (collection) => collection.collectionId === selectedCollectionId,
        ) ?? null)
      : null,
  );
  const selectedCollectionNfts = $derived(
    selectedCollectionId
      ? getNftsForCollection(visibleNfts, selectedCollectionId)
      : [],
  );

  $effect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(BALANCE_VISIBILITY_KEY, String(balanceVisible));
    }
  });

  $effect(() => {
    if (activeTab !== WalletTab.NFTS) {
      selectedCollectionId = null;
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
    onTabChange(tab);
  }

  function handleSelectCollection(collectionId: string) {
    selectedCollectionId = collectionId;
  }

  function handleCollectionBack() {
    selectedCollectionId = null;
  }

  function handleManageNfts() {
    onNavigateToManageNfts();
  }

  function handleReceive() {
    if (activeTab === WalletTab.NFTS) {
      onNavigateToNftReceive();
      return;
    }

    onNavigateToReceive();
  }

  function handleReceiveCollection(collectionId: string) {
    onNavigateToNftReceive(collectionId);
  }

  function handleLoadMoreNfts() {
    walletNftStore.loadMore();
  }
</script>

{#if activeTab === WalletTab.NFTS && selectedCollection}
  <NftCollectionDetail
    collection={selectedCollection}
    nfts={selectedCollectionNfts}
    onNavigateBack={handleCollectionBack}
    onReceive={handleReceiveCollection}
  />
{:else}
  <WalletOverviewHeader
    {activeTab}
    isBalanceVisible={balanceVisible}
    nftCount={visibleNfts.length}
    {collectionCount}
    onToggleBalance={handleToggle}
    onSend={onNavigateToSend}
    onReceive={handleReceive}
    onSwap={onNavigateToSwap}
    onManageNfts={handleManageNfts}
    onTabChange={handleTabChange}
  />

  <div class="pb-6 pt-4">
    {#if activeTab === WalletTab.TOKENS}
      {#if walletStore.query.data}
        <TokenList
          tokens={enabledTokens}
          {balanceVisible}
          onSelectToken={handleSelectToken}
          onImageError={handleImageError}
          {failedImageLoads}
        />

        <div class="mt-2 text-center">
          <button
            onclick={handleManageTokens}
            class="text-green hover:text-teal-700 text-sm transition-colors"
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
    {:else if activeTab === WalletTab.NFTS}
      {#if walletNftStore.query.data}
        <NftList
          nfts={visibleNfts}
          hasMore={walletNftStore.hasMore}
          onSelectCollection={handleSelectCollection}
          onLoadMore={handleLoadMoreNfts}
          onManageNfts={handleManageNfts}
        />
      {:else if walletNftStore.query.error}
        <div class="text-center py-8">
          <p class="text-red-600 mb-4">
            {locale.t("wallet.errorMsg")}
            {walletNftStore.query.error}
          </p>
        </div>
      {:else}
        <div class="text-center py-8">
          <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
        </div>
      {/if}
    {/if}
  </div>
{/if}
