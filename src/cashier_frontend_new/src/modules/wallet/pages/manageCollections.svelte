<script lang="ts">
  import { locale } from "$lib/i18n";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import { walletNftStore } from "$modules/wallet/state/walletNftStore.svelte";
  import type { NftCollectionSummary } from "$modules/wallet/types/nft";
  import { getNftCollectionSummaries } from "$modules/wallet/utils/nftCollections";
  import { Image, LoaderCircle, Search } from "lucide-svelte";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    onNavigateBack: () => void;
  };

  let { onNavigateBack }: Props = $props();

  let searchQuery = $state("");
  let failedImageLoads = new SvelteSet<string>();

  function getCollectionCountLabel(itemCount: number) {
    const label =
      itemCount === 1
        ? locale.t("wallet.nfts.manage.itemSingular")
        : locale.t("wallet.nfts.manage.itemPlural");

    return `${itemCount} ${label}`;
  }

  function getToggleLabel(collection: NftCollectionSummary) {
    return locale
      .t("wallet.nfts.manage.toggleAria")
      .replace("{{collection}}", collection.name);
  }

  function handleImageError(collectionId: string) {
    failedImageLoads.add(collectionId);
  }

  function handleToggle(collection: NftCollectionSummary) {
    walletNftStore.setCollectionEnabled(
      collection.collectionId,
      !walletNftStore.isCollectionEnabled(collection.collectionId),
    );
  }

  const collections = $derived(
    getNftCollectionSummaries(walletNftStore.query.data ?? []),
  );

  const filteredCollections = $derived.by(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return collections;
    }

    return collections.filter((collection) =>
      collection.name.toLowerCase().includes(normalizedSearch),
    );
  });
</script>

<div>
  <NavBar
    mode="back-only"
    title={locale.t("wallet.nfts.manage.header")}
    onBack={onNavigateBack}
  />

  <div class="px-4">
    <div class="relative mb-6">
      <Search
        class="text-walletpurple absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder={locale.t("wallet.nfts.manage.searchPlaceholder")}
        class="focus:border-walletpurple w-full rounded-lg border border-gray-200 py-2 pl-12 pr-4 text-gray-900 placeholder-gray-300 focus:outline-none"
      />
    </div>

    {#if walletNftStore.query.isLoading && !walletNftStore.query.data}
      <div class="flex items-center justify-center py-16">
        <LoaderCircle class="text-walletpurple h-8 w-8 animate-spin" />
      </div>
    {:else if walletNftStore.query.error && !walletNftStore.query.data}
      <div class="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
        {locale.t("wallet.manage.errorMessage")}: {walletNftStore.query.error}
      </div>
    {:else if filteredCollections.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div
          class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#E5EAE8] bg-white shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]"
        >
          <Image class="text-walletpurple" size={28} />
        </div>
        <p class="text-lg font-medium text-[#242424]">
          {locale.t("wallet.nfts.manage.emptyTitle")}
        </p>
      </div>
    {:else}
      <div class="space-y-1">
        {#each filteredCollections as collection (collection.collectionId)}
          {@const isEnabled = walletNftStore.isCollectionEnabled(
            collection.collectionId,
          )}
          <div class="flex items-center justify-between py-3">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <div
                class="bg-walletlightpurple flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl"
              >
                <img
                  src={failedImageLoads.has(collection.collectionId)
                    ? NFT_FALLBACK_IMAGE_URL
                    : collection.imageUrl || NFT_FALLBACK_IMAGE_URL}
                  alt={collection.name}
                  class="h-full w-full object-contain p-2"
                  onerror={() => handleImageError(collection.collectionId)}
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[15px] font-medium text-gray-900">
                  {collection.name}
                </div>
                <div class="text-sm text-gray-500">
                  {getCollectionCountLabel(collection.itemCount)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onclick={() => handleToggle(collection)}
              class="relative inline-flex h-5 w-8 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none {isEnabled
                ? 'bg-walletpurple'
                : 'bg-walletlightpurple'}"
              aria-label={getToggleLabel(collection)}
              aria-pressed={isEnabled}
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {isEnabled
                  ? 'translate-x-3.5'
                  : 'translate-x-0.5'}"
              >
              </span>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
