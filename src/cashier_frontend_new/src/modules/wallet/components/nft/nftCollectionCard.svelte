<script lang="ts">
  import type { NftCollectionSummary } from "$modules/wallet/types/nft";
  import { Image } from "lucide-svelte";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    collection: NftCollectionSummary;
    onSelect: (collectionId: string) => void;
  };

  let { collection, onSelect }: Props = $props();
  let failedImageLoads = new SvelteSet<string>();

  function handleImageError(collectionId: string) {
    failedImageLoads.add(collectionId);
  }
</script>

<button
  type="button"
  class="bg-walletlightpurple overflow-hidden rounded-lg text-left transition-transform active:scale-[0.98]"
  onclick={() => onSelect(collection.collectionId)}
>
  <div class="flex aspect-square items-center justify-center overflow-hidden">
    {#if collection.imageUrl && !failedImageLoads.has(collection.collectionId)}
      <img
        src={collection.imageUrl}
        alt={collection.name}
        class="h-full w-full object-cover"
        onerror={() => handleImageError(collection.collectionId)}
      />
    {:else}
      <Image class="text-walletpurple" size={48} />
    {/if}
  </div>
  <div class="flex items-center justify-between gap-2 px-2 py-1.5">
    <p class="text-walletpurple truncate text-xs font-medium">
      {collection.name}
    </p>
    <span class="text-[10px] text-grey">{collection.itemCount}</span>
  </div>
</button>
