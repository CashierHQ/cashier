<script lang="ts">
  import { locale } from "$lib/i18n";
  import NftCollectionCard from "$modules/wallet/components/nft/nftCollectionCard.svelte";
  import type { NftCollectionSummary } from "$modules/wallet/types/nft";
  import { Image } from "lucide-svelte";

  interface Props {
    collections: NftCollectionSummary[];
    onSelectCollection: (collectionId: string) => void;
    onManageNfts: () => void;
  }

  let { collections, onSelectCollection, onManageNfts }: Props = $props();
</script>

<div>
  {#if collections.length === 0}
    <div class="flex flex-col items-center py-20 text-center">
      <div
        class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#E5EAE8] bg-white shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]"
      >
        <Image class="text-walletpurple" size={28} />
      </div>
      <p class="mb-3 text-lg font-medium text-[#242424]">
        {locale.t("wallet.nfts.noCollections")}
      </p>
      <button
        type="button"
        onclick={onManageNfts}
        class="text-walletpurple hover:text-walletpurple/80 text-base font-medium transition-colors"
      >
        {locale.t("wallet.nfts.manageCta")}
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-2">
      {#each collections as collection (collection.collectionId)}
        <NftCollectionCard {collection} onSelect={onSelectCollection} />
      {/each}
    </div>
  {/if}
</div>
