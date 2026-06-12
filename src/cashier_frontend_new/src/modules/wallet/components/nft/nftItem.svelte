<script lang="ts">
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import type { EnrichedNFT } from "$modules/wallet/types/nft";

  interface Props {
    item: EnrichedNFT;
    onSelect: (collectionId: string, tokenId: bigint) => void;
  }

  let { item, onSelect }: Props = $props();
  let imageFailed = $state(false);
</script>

<button
  type="button"
  class="flex w-full items-center rounded-lg p-4 text-left hover:bg-gray-100"
  onclick={() => onSelect(item.collectionId, item.tokenId)}
>
  <div class="relative aspect-square w-full">
    <img
      src={imageFailed
        ? NFT_FALLBACK_IMAGE_URL
        : item.imageUrl || NFT_FALLBACK_IMAGE_URL}
      alt={item.name}
      class="h-full w-full object-contain p-6"
      onerror={() => (imageFailed = true)}
    />
    <!-- Overlay with gradient background -->
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
    >
      <div class="absolute bottom-0 left-0 right-0 p-3 text-white">
        <p class="truncate text-sm font-semibold">{item.collectionName}</p>
        <p class="text-xs opacity-90">#ID: {item.tokenId}</p>
      </div>
    </div>
  </div>
</button>
