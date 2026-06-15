<script lang="ts">
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import NftWalletTxCart from "$modules/transactionCart/components/NftWalletTxCart.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import { walletNftStore } from "$modules/wallet/state/walletNftStore.svelte";
  import type {
    EnrichedNFT,
    NftCollectionSummary,
  } from "$modules/wallet/types/nft";
  import {
    getNftCollectionSummaries,
    getNftsForCollection,
  } from "$modules/wallet/utils/nftCollections";
  import {
    ChevronRight,
    Image,
    Info,
    LoaderCircle,
    Search,
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    initialCollectionId?: string;
    initialTokenId?: bigint;
    onNavigateBack: () => void;
  };

  let { initialCollectionId, initialTokenId, onNavigateBack }: Props = $props();

  let selectedCollectionId = $state<string | null>(null);
  let selectedTokenId = $state<bigint | null>(null);
  let collectionSearchQuery = $state("");
  let nftSearchQuery = $state("");
  let sendAddress = $state("");
  let showConfirmDrawer = $state(false);
  let failedImageLoads = new SvelteSet<string>();
  let initialSelectionApplied = $state(false);

  const enabledNfts = $derived.by(() =>
    (walletNftStore.query.data ?? []).filter((nft) =>
      walletNftStore.isCollectionEnabled(nft.collectionId),
    ),
  );
  const collections = $derived(getNftCollectionSummaries(enabledNfts));
  const selectedCollection = $derived(
    selectedCollectionId
      ? (collections.find(
          (collection) => collection.collectionId === selectedCollectionId,
        ) ?? null)
      : null,
  );
  const selectedCollectionNfts = $derived(
    selectedCollectionId
      ? getNftsForCollection(enabledNfts, selectedCollectionId)
      : [],
  );
  const selectedNft = $derived(
    selectedTokenId !== null
      ? (selectedCollectionNfts.find(
          (nft) => nft.tokenId === selectedTokenId,
        ) ?? null)
      : null,
  );
  const filteredCollections = $derived.by(() => {
    const normalizedSearch = collectionSearchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return collections;
    }

    return collections.filter((collection) =>
      collection.name.toLowerCase().includes(normalizedSearch),
    );
  });
  const filteredNfts = $derived.by(() => {
    const normalizedSearch = nftSearchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return selectedCollectionNfts;
    }

    return selectedCollectionNfts.filter(
      (nft) =>
        nft.name.toLowerCase().includes(normalizedSearch) ||
        nft.tokenId.toString().includes(normalizedSearch),
    );
  });
  const canContinue = $derived(
    selectedNft !== null && sendAddress.trim().length > 0,
  );

  $effect(() => {
    if (!initialCollectionId || initialSelectionApplied) {
      return;
    }

    if (selectedCollectionId === null) {
      selectedCollectionId = initialCollectionId;
    }

    if (initialTokenId === undefined) {
      initialSelectionApplied = true;
      return;
    }

    if (selectedCollectionId !== initialCollectionId) {
      return;
    }

    const initialNft = selectedCollectionNfts.find(
      (nft) => nft.tokenId === initialTokenId,
    );

    if (!initialNft) {
      return;
    }

    selectedTokenId = initialNft.tokenId;
    initialSelectionApplied = true;
  });

  function getCollectionImage(collection: NftCollectionSummary) {
    if (failedImageLoads.has(collection.collectionId)) {
      return NFT_FALLBACK_IMAGE_URL;
    }

    return collection.imageUrl || NFT_FALLBACK_IMAGE_URL;
  }

  function getNftImage(nft: EnrichedNFT) {
    const imageKey = getNftImageKey(nft);

    if (failedImageLoads.has(imageKey)) {
      return NFT_FALLBACK_IMAGE_URL;
    }

    return nft.imageUrl || NFT_FALLBACK_IMAGE_URL;
  }

  function getNftImageKey(nft: EnrichedNFT) {
    return `${nft.collectionId}:${nft.tokenId.toString()}`;
  }

  function handleImageError(key: string) {
    failedImageLoads.add(key);
  }

  function handleSelectCollection(collection: NftCollectionSummary) {
    selectedCollectionId = collection.collectionId;
    selectedTokenId = null;
    nftSearchQuery = "";
    sendAddress = "";
  }

  function handleSelectNft(nft: EnrichedNFT) {
    selectedTokenId = nft.tokenId;
    sendAddress = "";
  }

  function handleBack() {
    if (showConfirmDrawer) {
      showConfirmDrawer = false;
      return;
    }

    if (selectedTokenId !== null) {
      selectedTokenId = null;
      sendAddress = "";
      return;
    }

    if (selectedCollectionId !== null) {
      selectedCollectionId = null;
      nftSearchQuery = "";
      return;
    }

    onNavigateBack();
  }

  function handleContinue() {
    if (!canContinue) {
      return;
    }

    showConfirmDrawer = true;
  }

  function handleConfirm() {
    showConfirmDrawer = false;
    toast.success(locale.t("wallet.nfts.send.confirmSuccess"));
    onNavigateBack();
  }
</script>

<NavBar
  mode="back-only"
  title={locale.t("wallet.nfts.send.header")}
  onBack={handleBack}
/>

<div class="flex flex-1 flex-col px-4">
  {#if !selectedCollection}
    <div>
      <div class="flex items-start gap-1.5">
        <Info class="text-walletpurple mt-2 h-4 w-4 flex-shrink-0" />
        <p class="text-walletpurple text-xs leading-tight">
          {locale.t("wallet.nfts.send.selectionWarning")}
        </p>
      </div>

      <div class="relative my-6">
        <Search
          class="text-walletpurple absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
        />
        <input
          type="text"
          bind:value={collectionSearchQuery}
          placeholder={locale.t("wallet.nfts.send.searchCollectionPlaceholder")}
          class="focus:border-walletpurple w-full rounded-lg border border-gray-200 py-2 pl-12 pr-4 text-gray-900 placeholder-gray-300 focus:outline-none"
        />
      </div>

      <p class="text-sm font-medium text-gray-900">
        {locale.t("wallet.nfts.send.enabledCollections")}
      </p>

      {#if walletNftStore.query.isLoading && !walletNftStore.query.data}
        <div class="flex items-center justify-center py-12">
          <LoaderCircle class="text-walletpurple h-8 w-8 animate-spin" />
        </div>
      {:else if filteredCollections.length === 0}
        <div
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <Image class="text-walletpurple mb-3" size={32} />
          <p class="text-sm text-gray-500">
            {locale.t("wallet.nfts.manage.emptyTitle")}
          </p>
        </div>
      {:else}
        <div class="space-y-1">
          {#each filteredCollections as collection (collection.collectionId)}
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left"
              onclick={() => handleSelectCollection(collection)}
            >
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="bg-walletlightpurple flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl"
                >
                  <img
                    src={getCollectionImage(collection)}
                    alt={collection.name}
                    class="h-full w-full object-contain p-2"
                    onerror={() => handleImageError(collection.collectionId)}
                  />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-900">
                    {collection.name}
                  </p>
                  <p class="text-xs text-gray-500">
                    {collection.itemCount}
                    {collection.itemCount === 1
                      ? locale.t("wallet.nfts.manage.itemSingular")
                      : locale.t("wallet.nfts.manage.itemPlural")}
                  </p>
                </div>
              </div>
              <ChevronRight class="text-walletpurple h-5 w-5 flex-shrink-0" />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else if !selectedNft}
    <div>
      <div class="relative mb-6">
        <Search
          class="text-walletpurple absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
        />
        <input
          type="text"
          bind:value={nftSearchQuery}
          placeholder={locale.t("wallet.nfts.send.searchNftPlaceholder")}
          class="focus:border-walletpurple w-full rounded-lg border border-gray-200 py-2 pl-12 pr-4 text-gray-900 placeholder-gray-300 focus:outline-none"
        />
      </div>

      <p class="mb-4 text-sm font-medium text-gray-900">
        {locale
          .t("wallet.nfts.send.collectionNfts")
          .replace("{{collection}}", selectedCollection.name)}
      </p>

      {#if filteredNfts.length === 0}
        <div
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <Image class="text-walletpurple mb-3" size={32} />
          <p class="text-sm text-gray-500">
            {locale.t("wallet.nfts.send.emptyNfts")}
          </p>
        </div>
      {:else}
        <div class="space-y-1">
          {#each filteredNfts as nft (nft.tokenId.toString())}
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left"
              onclick={() => handleSelectNft(nft)}
            >
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="bg-walletlightpurple flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl"
                >
                  <img
                    src={getNftImage(nft)}
                    alt={nft.name}
                    class="h-full w-full object-contain p-2"
                    onerror={() => handleImageError(getNftImageKey(nft))}
                  />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-900">
                    {nft.name}
                  </p>
                  <p class="text-xs text-gray-500">#{nft.tokenId.toString()}</p>
                </div>
              </div>
              <ChevronRight class="text-walletpurple h-5 w-5 flex-shrink-0" />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex flex-1 flex-col">
      <section class="space-y-2">
        <p class="text-sm font-medium text-gray-900">
          {locale.t("wallet.nfts.send.assetLabel")}
        </p>
        <div
          class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="bg-walletlightpurple flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded"
            >
              <img
                src={getNftImage(selectedNft)}
                alt={selectedNft.name}
                class="h-full w-full object-contain"
                onerror={() => handleImageError(getNftImageKey(selectedNft))}
              />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900">
                {selectedNft.name}
              </p>
              <p class="truncate text-xs text-gray-700">
                {selectedNft.collectionName}
              </p>
            </div>
          </div>
          <span
            class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500"
          >
            {selectedNft.standard ??
              selectedCollection.standard ??
              locale.t("wallet.nfts.send.standardFallback")}
          </span>
        </div>
      </section>

      <section class="mt-5 space-y-2">
        <p class="text-sm font-medium text-gray-900">
          {locale.t("wallet.nfts.send.addressLabel")}
        </p>
        <input
          type="text"
          bind:value={sendAddress}
          placeholder={locale.t("wallet.nfts.send.addressPlaceholder")}
          class="focus:border-walletpurple w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none"
        />
        <p class="text-xs text-gray-400">
          {locale.t("wallet.nfts.send.addressExample")}
        </p>
      </section>

      <div class="mt-auto pb-4 pt-8">
        <Button
          onclick={handleContinue}
          disabled={!canContinue}
          class="bg-walletpurple hover:bg-walletpurple/90 inline-flex h-[44px] w-full cursor-pointer items-center justify-center rounded-full px-4 font-medium text-primary-foreground shadow disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
        >
          {locale.t("wallet.nfts.send.continueButton")}
        </Button>
      </div>
    </div>
  {/if}
</div>

{#if selectedNft}
  <NftWalletTxCart
    nft={selectedNft}
    collectionStandard={selectedCollection?.standard ?? null}
    {sendAddress}
    bind:isOpen={showConfirmDrawer}
    onCloseDrawer={() => (showConfirmDrawer = false)}
    onConfirm={handleConfirm}
  />
{/if}
