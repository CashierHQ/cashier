<script lang="ts">
  import { locale } from "$lib/i18n";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import { collectionStore } from "$modules/wallet/state/collectionStore.svelte";
  import type { CollectionSummary } from "$modules/wallet/types/nft";
  import { Image, LoaderCircle, Search } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";

  type Props = {
    onNavigateBack: () => void;
  };

  let { onNavigateBack }: Props = $props();

  let searchQuery = $state("");
  let failedImageLoads = new SvelteSet<string>();
  let optimisticUpdates = new SvelteMap<string, boolean>();
  let pendingToggleIds = new SvelteSet<string>();

  function getCollectionCountLabel(itemCount: number) {
    const label =
      itemCount === 1
        ? locale.t("wallet.nfts.manage.itemSingular")
        : locale.t("wallet.nfts.manage.itemPlural");

    return `${itemCount} ${label}`;
  }

  function getToggleLabel(collection: CollectionSummary) {
    return locale
      .t("wallet.nfts.manage.toggleAria")
      .replace("{{collection}}", collection.name);
  }

  function handleImageError(collectionId: string) {
    failedImageLoads.add(collectionId);
  }

  function isEnabled(collectionId: string): boolean {
    return (
      optimisticUpdates.get(collectionId) ??
      collectionStore.isCollectionEnabled(collectionId)
    );
  }

  function handleToggle(collection: CollectionSummary) {
    if (pendingToggleIds.has(collection.collectionId)) return;

    const newEnabled = !isEnabled(collection.collectionId);
    optimisticUpdates.set(collection.collectionId, newEnabled);
    pendingToggleIds.add(collection.collectionId);

    collectionStore
      .toggleCollection(collection.collectionId, newEnabled)
      .then(() => {
        optimisticUpdates.delete(collection.collectionId);
      })
      .catch((error) => {
        optimisticUpdates.delete(collection.collectionId);
        toast.error(locale.t("wallet.nfts.manage.toggleError") + ": " + error);
      })
      .finally(() => {
        pendingToggleIds.delete(collection.collectionId);
      });
  }

  const collections = $derived(collectionStore.query.data ?? []);

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

    {#if collectionStore.query.isLoading && !collectionStore.query.data}
      <div class="flex items-center justify-center py-16">
        <LoaderCircle class="text-walletpurple h-8 w-8 animate-spin" />
      </div>
    {:else if collectionStore.query.error && !collectionStore.query.data}
      <div class="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
        {locale.t("wallet.manage.errorMessage")}: {collectionStore.query.error}
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
      <div>
        {#each filteredCollections as collection (collection.collectionId)}
          {@const enabled = isEnabled(collection.collectionId)}
          <div class="flex items-center justify-between py-2">
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
                <div class="truncate text-[14px] font-normal text-gray-900">
                  {collection.name}
                </div>
                <div class="text-sm text-gray-400">
                  {getCollectionCountLabel(collection.itemCount)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onclick={() => handleToggle(collection)}
              disabled={pendingToggleIds.has(collection.collectionId)}
              class="relative inline-flex h-5 w-8 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 {enabled
                ? 'bg-walletpurple'
                : 'bg-walletlightpurple'}"
              aria-label={getToggleLabel(collection)}
              aria-pressed={enabled}
              aria-busy={pendingToggleIds.has(collection.collectionId)}
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {enabled
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
