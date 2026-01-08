<script lang="ts">
  import type { EnrichedNFT } from '$modules/wallet/types/nft';

  interface Props {
    item: EnrichedNFT;
    onSelect: (collectionAddress: string, tokenId: bigint) => void;
    failedImageLoads: Set<string>;
    onImageError: (address: string, tokenId: bigint) => void;
  }

  let {
    item,
    onSelect,
    failedImageLoads,
    onImageError,
  }: Props = $props();

  function handleImageError() {
    onImageError(item.collectionId, item.tokenId);
  }

</script>
<li>
  <button
    type="button"
    class="w-full flex items-center p-4 hover:bg-gray-100 rounded-lg text-left"
    onclick={() => onSelect(item.collectionId, item.tokenId)}
  >
    <img
      src={item.imageUrl}
      alt={item.name}
      class="w-12 h-12 rounded-md object-cover mr-4"
      onerror={handleImageError}
    />
  </button>
</li>
