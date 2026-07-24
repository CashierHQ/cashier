<script lang="ts">
  import { locale } from "$lib/i18n";
  import NftCardDetail from "$modules/wallet/components/nft/nftCardDetail.svelte";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import type {
    EnrichedNFT,
    NftCollectionSummary,
  } from "$modules/wallet/types/nft";
  import { ArrowDown, ChevronLeft, Copy, RefreshCw } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    collection: NftCollectionSummary;
    nfts: EnrichedNFT[];
    initialTokenId?: bigint;
    onNavigateBack: () => void;
    onReceive: (collectionId: string) => void;
    onSend: (collectionId: string, tokenId: bigint) => void;
    onRefresh: () => Promise<void> | void;
    isRefreshing?: boolean;
  };

  let {
    collection,
    nfts,
    initialTokenId,
    onNavigateBack,
    onReceive,
    onSend,
    onRefresh,
    isRefreshing = false,
  }: Props = $props();
  let failedImageLoads = new SvelteSet<string>();
  let selectedTokenId = $state<bigint | null>(null);
  let initialTokenApplied = $state(false);

  const selectedNft = $derived(
    selectedTokenId !== null
      ? (nfts.find((nft) => nft.tokenId === selectedTokenId) ?? null)
      : null,
  );

  function handleImageError(id: string) {
    failedImageLoads.add(id);
  }

  async function copyCanisterId() {
    try {
      await navigator.clipboard.writeText(collection.collectionId);
      toast.success(locale.t("constants.copiedToClipboard"));
    } catch {
      toast.error(locale.t("wallet.receive.copyError"));
    }
  }

  $effect(() => {
    if (initialTokenApplied || initialTokenId === undefined) {
      return;
    }

    selectedTokenId = initialTokenId;
    initialTokenApplied = true;
  });

  function handleBack() {
    if (selectedTokenId !== null) {
      selectedTokenId = null;
      return;
    }

    onNavigateBack();
  }
</script>

<div>
  <div class="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-4 pt-4">
    <button
      type="button"
      onclick={handleBack}
      class="-ml-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
      aria-label={locale.t("wallet.navBar.back")}
    >
      <ChevronLeft size={24} />
    </button>

    <h1 class="truncate text-center text-xl font-bold text-gray-950">
      {collection.name}
    </h1>

    <button
      type="button"
      onclick={onRefresh}
      disabled={isRefreshing}
      aria-busy={isRefreshing}
      class="text-green flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-lightgreen disabled:cursor-not-allowed disabled:opacity-70"
      aria-label={locale.t("wallet.nfts.detail.refreshAria")}
    >
      <RefreshCw size={22} class={isRefreshing ? "animate-spin" : ""} />
    </button>
  </div>

  {#if selectedNft}
    <NftCardDetail nft={selectedNft} {collection} {onSend} />
  {:else}
    <div class="px-4">
      <section class="rounded-lg border border-lightgreen p-3">
        <div class="mb-3 flex items-start justify-between gap-3">
          <div class="flex min-w-0 gap-3">
            <div
              class="bg-walletlightpurple flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded"
            >
              <img
                src={failedImageLoads.has(collection.collectionId)
                  ? NFT_FALLBACK_IMAGE_URL
                  : collection.imageUrl || NFT_FALLBACK_IMAGE_URL}
                alt={collection.name}
                class="h-full w-full object-cover"
                onerror={() => handleImageError(collection.collectionId)}
              />
            </div>
            <div class="min-w-0">
              <h2 class="truncate text-sm font-medium text-gray-900">
                {collection.name}
              </h2>
              <p class="text-xs font-light text-gray-900">
                {locale.t("wallet.nfts.detail.supply")}
                <span class="font-medium">{collection.supply ?? "-"}</span>
                <span class="mx-1 text-gray-400">|</span>
                {locale.t("wallet.nfts.detail.floor")}
                <span class="font-medium">{collection.floor ?? "-"}</span>
              </p>
            </div>
          </div>
        </div>

        <p class="mb-4 text-sm leading-snug text-gray-700">
          {collection.description}
        </p>

        <dl class="space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-gray-700 font-medium">
              {locale.t("wallet.nfts.detail.type")}
            </dt>
            <dd class="text-right text-gray-900">{collection.type ?? "-"}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-700 font-medium">
              {locale.t("wallet.nfts.detail.standard")}
            </dt>
            <dd class="text-right text-gray-900">
              {collection.standard ?? "-"}
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-700 font-medium">
              {locale.t("wallet.nfts.detail.symbol")}
            </dt>
            <dd class="text-right text-gray-900">{collection.symbol ?? "-"}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-700 font-medium">
              {locale.t("wallet.nfts.detail.canisterId")}
            </dt>
            <dd
              class="flex min-w-0 items-center justify-end gap-1 text-right text-gray-900"
            >
              <span class="truncate"
                >{transformShortAddress(collection.collectionId)}</span
              >
              <button
                type="button"
                class="text-walletpurple flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full hover:bg-walletlightpurple"
                aria-label={locale.t("wallet.nfts.detail.copyCanisterId")}
                onclick={copyCanisterId}
              >
                <Copy size={15} />
              </button>
            </dd>
          </div>
        </dl>
      </section>

      <div class="mt-4 grid grid-cols-2 gap-2 cursor-pointer">
        <button
          type="button"
          onclick={() => onReceive(collection.collectionId)}
          class="receive-nft-tile relative flex h-full flex-col items-center justify-center gap-3 rounded-lg text-walletpurple"
        >
          <span
            class="border-walletpurple/10 flex h-11 w-11 items-center justify-center rounded-lg border bg-white text-xl"
          >
            <ArrowDown size={22} />
          </span>
          <span class="text-sm font-medium">
            {locale.t("wallet.nfts.detail.receiveNft")}
          </span>
        </button>

        {#each nfts as nft (nft.collectionId + nft.tokenId.toString())}
          <button
            type="button"
            class="bg-walletlightpurple overflow-hidden rounded-lg text-left transition-transform active:scale-[0.98]"
            onclick={() => (selectedTokenId = nft.tokenId)}
          >
            <div class="aspect-square overflow-hidden">
              <img
                src={failedImageLoads.has(
                  `${nft.collectionId}-${nft.tokenId.toString()}`,
                )
                  ? NFT_FALLBACK_IMAGE_URL
                  : nft.imageUrl || NFT_FALLBACK_IMAGE_URL}
                alt={nft.name}
                class="h-full w-full object-cover"
                onerror={() =>
                  handleImageError(
                    `${nft.collectionId}-${nft.tokenId.toString()}`,
                  )}
              />
            </div>
            <div class="flex items-center justify-between gap-2 px-2 py-1.5">
              <span class="text-walletpurple truncate text-xs">
                #{nft.tokenId.toString()}
              </span>
              {#if nft.rarity}
                <span class="text-[10px] text-grey">
                  {locale.t("wallet.nfts.detail.rarity")}
                  {nft.rarity}
                </span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .receive-nft-tile {
    background:
      repeating-linear-gradient(
          90deg,
          rgb(139 92 246 / 0.2) 0 12px,
          transparent 12px 22px
        )
        top left / 100% 2px no-repeat,
      repeating-linear-gradient(
          90deg,
          rgb(139 92 246 / 0.2) 0 12px,
          transparent 12px 22px
        )
        bottom left / 100% 2px no-repeat,
      repeating-linear-gradient(
          180deg,
          rgb(139 92 246 / 0.2) 0 12px,
          transparent 12px 22px
        )
        top left / 2px 100% no-repeat,
      repeating-linear-gradient(
          180deg,
          rgb(139 92 246 / 0.2) 0 12px,
          transparent 12px 22px
        )
        top right / 2px 100% no-repeat;
  }
</style>
