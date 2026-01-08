<script lang="ts">
  import type { NFT } from '$modules/wallet/types/nft';


  interface Props {
    item: NFT;
    onSelect: (address: string) => void;
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
  }

  let {
    item,
    onSelect,
    failedImageLoads,
    onImageError,
  }: Props = $props();

</script>
<div>
  
</div>
