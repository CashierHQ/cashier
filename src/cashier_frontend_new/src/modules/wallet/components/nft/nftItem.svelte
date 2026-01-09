<script lang="ts">
  import type { EnrichedNFT } from "$modules/wallet/types/nft";

  interface Props {
    item: EnrichedNFT;
    onSelect: (collectionId: string, tokenId: bigint) => void;
  }

  let { item, onSelect }: Props = $props();
</script>

<button
  type="button"
  class="w-full flex items-center p-4 hover:bg-gray-100 rounded-lg text-left"
  onclick={() => onSelect(item.collectionId, item.tokenId)}
>
  <div class="relative w-full aspect-square">
    <img
      src={item.imageUrl}
      alt={item.name}
      class="w-full h-full object-cover"
    />
    <!-- Overlay with gradient background -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"
    >
      <div class="absolute bottom-0 left-0 right-0 p-3 text-white">
        <p class="text-sm font-semibold truncate">{item.collectionName}</p>
        <p class="text-xs opacity-90">#ID: {item.tokenId}</p>
      </div>
    </div>
  </div>
</button>
