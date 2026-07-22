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
  import { collectionStore } from "$modules/wallet/state/collectionStore.svelte";
  import { nftPortfolioStore } from "$modules/wallet/state/nftPortfolioStore.svelte";
  import {
    getOwnedNftCountForCollection,
    mergeOwnedAndPortfolioNfts,
  } from "$modules/wallet/utils/nftCollections";

  type Props = {
    activeTab?: WalletTab;
    initialSelectedCollectionId?: string;
    initialSelectedTokenId?: bigint;
    onNavigateToToken: (token: string) => void;
    onNavigateToManage: () => void;
    onNavigateToSend: () => void;
    onNavigateToNftSend: (collectionId?: string, tokenId?: bigint) => void;
    onNavigateToReceive: () => void;
    onNavigateToNftReceive: (collectionId?: string) => void;
    onNavigateToSwap: () => void;
    onNavigateToManageNfts: () => void;
    onTabChange: (tab: WalletTab) => void;
    onNestedViewChange?: (isNested: boolean) => void;
  };

  let {
    activeTab = WalletTab.TOKENS,
    initialSelectedCollectionId,
    initialSelectedTokenId,
    onNavigateToToken,
    onNavigateToManage,
    onNavigateToSend,
    onNavigateToNftSend,
    onNavigateToReceive,
    onNavigateToNftReceive,
    onNavigateToSwap,
    onNavigateToManageNfts,
    onTabChange,
    onNestedViewChange,
  }: Props = $props();

  let failedImageLoads = new SvelteSet<string>();
  let selectedCollectionId = $state<string | null>(null);
  let initialSelectionApplied = $state(false);

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
      collectionStore.isCollectionEnabled(nft.collectionId),
    ),
  );
  // Registry rows for the collections the user has enabled, with per-collection
  // counts sourced from both manual wallet NFTs and nftGeek portfolio ownership.
  const nftCollections = $derived.by(() =>
    (collectionStore.query.data ?? [])
      .filter((collection) =>
        collectionStore.isCollectionEnabled(collection.collectionId),
      )
      .map((collection) => {
        const itemCount = getOwnedNftCountForCollection(
          visibleNfts,
          nftPortfolioStore.getTokensForCollection(collection.collectionId),
          collection.collectionId,
          collection.name,
          collection.standard,
        );

        return {
          collectionId: collection.collectionId,
          name: collection.name,
          description: collection.description,
          imageUrl: collection.imageUrl,
          itemCount,
          standard: collection.standard,
        };
      }),
  );
  const nftCount = $derived(
    nftCollections.reduce(
      (total, collection) => total + collection.itemCount,
      0,
    ),
  );
  const collectionCount = $derived(nftCollections.length);
  const isRefreshingNfts = $derived(
    walletNftStore.query.isLoading || nftPortfolioStore.query.isLoading,
  );
  const selectedCollection = $derived.by(() => {
    if (!selectedCollectionId) return null;

    const collection = nftCollections.find(
      (collection) => collection.collectionId === selectedCollectionId,
    );
    return collection ?? null;
  });
  const selectedCollectionNfts = $derived.by(() => {
    const collectionId = selectedCollectionId;
    if (!collectionId) return [];

    const collectionName = selectedCollection?.name ?? "";
    const standard = selectedCollection?.standard;

    return mergeOwnedAndPortfolioNfts(
      visibleNfts,
      nftPortfolioStore.getTokensForCollection(collectionId),
      collectionId,
      collectionName,
      standard,
    );
  });

  $effect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(BALANCE_VISIBILITY_KEY, String(balanceVisible));
    }
  });

  $effect(() => {
    if (initialSelectionApplied || activeTab !== WalletTab.NFTS) {
      return;
    }

    if (initialSelectedCollectionId) {
      selectedCollectionId = initialSelectedCollectionId;
    }

    initialSelectionApplied = true;
  });

  $effect(() => {
    if (activeTab !== WalletTab.NFTS) {
      selectedCollectionId = null;
      initialSelectionApplied = false;
    }
  });

  $effect(() => {
    onNestedViewChange?.(
      activeTab === WalletTab.NFTS && selectedCollectionId !== null,
    );
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

  function handleSend() {
    if (activeTab === WalletTab.NFTS) {
      onNavigateToNftSend();
      return;
    }

    onNavigateToSend();
  }

  function handleReceiveCollection(collectionId: string) {
    onNavigateToNftReceive(collectionId);
  }

  function handleSendNft(collectionId: string, tokenId: bigint) {
    onNavigateToNftSend(collectionId, tokenId);
  }

  async function handleRefreshCollectionDetail() {
    await Promise.allSettled([
      walletNftStore.query.refreshAsync(),
      nftPortfolioStore.query.refreshAsync(),
    ]);
  }
</script>

{#if activeTab === WalletTab.NFTS && selectedCollection}
  <NftCollectionDetail
    collection={selectedCollection}
    nfts={selectedCollectionNfts}
    initialTokenId={initialSelectedTokenId}
    onNavigateBack={handleCollectionBack}
    onReceive={handleReceiveCollection}
    onSend={handleSendNft}
    onRefresh={handleRefreshCollectionDetail}
    isRefreshing={isRefreshingNfts}
  />
{:else}
  <WalletOverviewHeader
    {activeTab}
    isBalanceVisible={balanceVisible}
    {nftCount}
    {collectionCount}
    onToggleBalance={handleToggle}
    onSend={handleSend}
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
      {#if collectionStore.query.data}
        <NftList
          collections={nftCollections}
          onSelectCollection={handleSelectCollection}
          onManageNfts={handleManageNfts}
        />
      {:else if collectionStore.query.error}
        <div class="text-center py-8">
          <p class="text-red-600 mb-4">
            {locale.t("wallet.errorMsg")}
            {collectionStore.query.error}
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
