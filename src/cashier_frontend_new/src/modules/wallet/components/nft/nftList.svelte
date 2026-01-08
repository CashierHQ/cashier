<script lang="ts">
  import { locale } from "$lib/i18n";
  import NFTItem from "$modules/wallet/components/nft/nftItem.svelte";
  import type { NFT } from '$modules/wallet/types/nft';

  interface Props {
    nfts: NFT[];
    balanceVisible: boolean;
    onSelectNFT: (collectionAddress: string, tokenId: bigint) => void;
    onNFTImageError: (collectionAddress: string, tokenId: bigint) => void;
    failedImageLoads: Set<string>;
  }

  let {
    nfts,
    balanceVisible,
    onSelectNFT,
    onNFTImageError,
    failedImageLoads,
  }: Props = $props();
</script>
<div>
  {#if nfts.length > 0}
    <div class="text-center py-8">
      <p class="text-gray-500 mb-4">
        {locale.t("wallet.noNFTsMsg")}
      </p>
    </div>
  {:else}
    <ul class="space-y-0">
      {#each nfts as nft (nft.collectionAddress + nft.id)}
        <NFTItem
          item={nft}
          onSelect={onSelectNFT}
          {failedImageLoads}
          onImageError={onNFTImageError}
        />
      {/each}
  </ul>
  {/if}
</div>