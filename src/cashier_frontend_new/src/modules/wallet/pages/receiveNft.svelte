<script lang="ts">
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import { collectionStore } from "$modules/wallet/state/collectionStore.svelte";
  import type { CollectionSummary } from "$modules/wallet/types/nft";
  import {
    ChevronRight,
    Copy,
    Image,
    Info,
    LoaderCircle,
    Search,
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    initialCollectionId?: string;
    onNavigateBack: () => void;
  };

  let { initialCollectionId, onNavigateBack }: Props = $props();

  let selectedCollectionId = $state<string | null>(null);
  let searchQuery = $state("");
  let failedImageLoads = new SvelteSet<string>();
  let initialSelectionApplied = $state(false);

  // Registry rows for the collections the user has enabled — not derived from owned NFTs,
  // since receiving is precisely how a user gets their first NFT in a collection.
  const collections = $derived(
    (collectionStore.query.data ?? []).filter((collection) =>
      collectionStore.isCollectionEnabled(collection.collectionId),
    ),
  );
  const selectedCollection = $derived(
    selectedCollectionId
      ? (collections.find(
          (collection) => collection.collectionId === selectedCollectionId,
        ) ?? null)
      : null,
  );
  const principalAddress = $derived(authState.account?.owner || "");
  const shortenedPrincipalAddress = $derived(
    transformShortAddress(principalAddress),
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

  $effect(() => {
    if (
      initialSelectionApplied ||
      !initialCollectionId ||
      selectedCollectionId !== null
    ) {
      return;
    }

    selectedCollectionId = initialCollectionId;
    initialSelectionApplied = true;
  });

  function handleBack() {
    if (selectedCollectionId !== null && !initialCollectionId) {
      selectedCollectionId = null;
      return;
    }

    onNavigateBack();
  }

  function handleClose() {
    onNavigateBack();
  }

  $effect(() => {
    if (!initialCollectionId) {
      return;
    }

    if (selectedCollectionId === null) {
      selectedCollectionId = initialCollectionId;
    }
  });

  function handleImageError(collectionId: string) {
    failedImageLoads.add(collectionId);
  }

  function handleSelectCollection(collection: CollectionSummary) {
    selectedCollectionId = collection.collectionId;
  }

  const selectedWarningParts = $derived.by(() => {
    const template = locale.t("wallet.nfts.receive.selectedWarning");
    const [prefix, suffix = ""] = template.split("{{collection}}");
    return { prefix, suffix };
  });

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(principalAddress);
      toast.success(locale.t("wallet.receive.copySuccess"));
    } catch {
      toast.error(locale.t("wallet.receive.copyError"));
    }
  }
</script>

<NavBar
  mode="back-only"
  title={locale.t("wallet.nfts.receive.header")}
  onBack={handleBack}
/>

<div class="flex flex-1 flex-col px-4">
  {#if selectedCollection}
    <div class="space-y-5">
      <div class="flex items-start gap-1.5">
        <Info class="text-walletpurple mt-0.5 h-4 w-4 flex-shrink-0" />
        <p class="text-walletpurple text-xs leading-tight">
          {selectedWarningParts.prefix}<span class="font-semibold"
            >{selectedCollection.name}</span
          >{selectedWarningParts.suffix}
        </p>
      </div>

      <section class="space-y-2">
        <p class="text-sm font-medium text-gray-900">
          {locale.t("wallet.nfts.receive.collectionLabel")}
        </p>
        <div
          class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="bg-walletlightpurple flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded"
            >
              <img
                src={failedImageLoads.has(selectedCollection.collectionId)
                  ? NFT_FALLBACK_IMAGE_URL
                  : selectedCollection.imageUrl || NFT_FALLBACK_IMAGE_URL}
                alt={selectedCollection.name}
                class="h-full w-full object-contain p-2"
                onerror={() =>
                  handleImageError(selectedCollection.collectionId)}
              />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900">
                {selectedCollection.name}
              </p>
              <p class="text-xs text-gray-700">-</p>
            </div>
          </div>
          <span
            class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500"
          >
            {selectedCollection.standard ??
              locale.t("wallet.nfts.receive.standardFallback")}
          </span>
        </div>
      </section>

      <section class="space-y-2">
        <p class="text-sm font-medium text-gray-900">
          {locale.t("wallet.nfts.receive.addressLabel")}
        </p>
        <div class="relative">
          <input
            type="text"
            value={shortenedPrincipalAddress}
            readonly
            class="focus:border-walletpurple w-full rounded-lg border border-gray-300 bg-white p-3 pr-12 font-mono text-sm text-gray-900 focus:outline-none"
          />
          <button
            type="button"
            onclick={handleCopyAddress}
            class="text-walletpurple hover:text-walletpurple/80 absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            aria-label={locale.t("wallet.receive.copyTooltip")}
          >
            <Copy size={18} />
          </button>
        </div>
      </section>
    </div>

    <div class="mt-auto pb-4 pt-8">
      <Button
        onclick={handleClose}
        class="bg-walletpurple hover:bg-walletpurple/90 inline-flex h-[44px] w-full cursor-pointer items-center justify-center rounded-full px-4 font-medium text-primary-foreground shadow"
        type="button"
      >
        {locale.t("wallet.receive.closeButton")}
      </Button>
    </div>
  {:else}
    <div>
      <div class="flex items-start gap-1.5">
        <Info class="text-walletpurple mt-2 h-4 w-4 flex-shrink-0" />
        <p class="text-walletpurple text-xs leading-tight">
          {locale.t("wallet.nfts.receive.selectionWarning")}
        </p>
      </div>

      <div class="relative my-6">
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

      <p class="text-sm font-medium text-gray-900">
        {locale.t("wallet.nfts.receive.enabledCollections")}
      </p>

      {#if collectionStore.query.isLoading && !collectionStore.query.data}
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
              class="flex w-full items-center justify-between gap-3 py-2 text-left"
              onclick={() => handleSelectCollection(collection)}
            >
              <div class="flex min-w-0 items-center gap-3">
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
  {/if}
</div>
