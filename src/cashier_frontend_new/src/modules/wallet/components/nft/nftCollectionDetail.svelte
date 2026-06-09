<script lang="ts">
  import { locale } from "$lib/i18n";
  import NavBar from "$modules/token/components/navBar.svelte";
  import type {
    EnrichedNFT,
    NftCollectionSummary,
  } from "$modules/wallet/types/nft";
  import { ArrowDown, Image, RefreshCw } from "lucide-svelte";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    collection: NftCollectionSummary;
    nfts: EnrichedNFT[];
    onNavigateBack: () => void;
    onReceive: (collectionId: string) => void;
  };

  let { collection, nfts, onNavigateBack, onReceive }: Props = $props();
  let failedImageLoads = new SvelteSet<string>();

  function handleImageError(id: string) {
    failedImageLoads.add(id);
  }
</script>

<div>
  <div class="flex items-start gap-2">
    <div class="flex-1">
      <NavBar
        mode="back-only"
        title={collection.name}
        onBack={onNavigateBack}
      />
    </div>
    <button
      type="button"
      class="text-green mt-1 rounded-full p-2 transition-colors hover:bg-lightgreen"
      aria-label={locale.t("wallet.nfts.detail.refreshAria")}
    >
      <RefreshCw size={22} />
    </button>
  </div>

  <div class="px-4">
    <section class="rounded-lg border border-[#E5EAE8] p-3">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div class="flex min-w-0 gap-3">
          <div
            class="bg-walletlightpurple flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded"
          >
            {#if collection.imageUrl && !failedImageLoads.has(collection.collectionId)}
              <img
                src={collection.imageUrl}
                alt={collection.name}
                class="h-full w-full object-cover"
                onerror={() => handleImageError(collection.collectionId)}
              />
            {:else}
              <Image class="text-walletpurple" size={28} />
            {/if}
          </div>
          <div class="min-w-0">
            <h2 class="truncate text-sm font-medium text-gray-900">
              {collection.name}
            </h2>
            <p class="text-xs text-gray-900">
              {locale.t("wallet.nfts.detail.supply")}
              {collection.supply ?? "-"}
              <span class="mx-1 text-gray-400">|</span>
              {locale.t("wallet.nfts.detail.floor")}
              {collection.floor ?? "-"}
            </p>
          </div>
        </div>
      </div>

      <p class="mb-4 text-sm leading-snug text-gray-700">
        {collection.description}
      </p>

      <dl class="space-y-2 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-gray-700">{locale.t("wallet.nfts.detail.type")}</dt>
          <dd class="text-right text-gray-900">{collection.type ?? "-"}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-700">
            {locale.t("wallet.nfts.detail.standard")}
          </dt>
          <dd class="text-right text-gray-900">{collection.standard ?? "-"}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-700">{locale.t("wallet.nfts.detail.symbol")}</dt>
          <dd class="text-right text-gray-900">{collection.symbol ?? "-"}</dd>
        </div>
      </dl>
    </section>

    <div class="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        onclick={() => onReceive(collection.collectionId)}
        class="border-walletpurple/20 flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-walletpurple"
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
        <div class="bg-walletlightpurple overflow-hidden rounded-lg">
          <div class="aspect-square overflow-hidden">
            {#if nft.imageUrl && !failedImageLoads.has(`${nft.collectionId}-${nft.tokenId.toString()}`)}
              <img
                src={nft.imageUrl}
                alt={nft.name}
                class="h-full w-full object-cover"
                onerror={() =>
                  handleImageError(
                    `${nft.collectionId}-${nft.tokenId.toString()}`,
                  )}
              />
            {:else}
              <div
                class="flex h-full w-full items-center justify-center bg-walletlightpurple"
              >
                <Image class="text-walletpurple" size={42} />
              </div>
            {/if}
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
        </div>
      {/each}
    </div>
  </div>
</div>
