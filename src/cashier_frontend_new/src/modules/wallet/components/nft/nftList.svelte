<script lang="ts">
  import { locale } from "$lib/i18n";
  import NFTItem from "$modules/wallet/components/nft/nftItem.svelte";
  import type { EnrichedNFT } from '$modules/wallet/types/nft';

  interface Props {
    nfts: EnrichedNFT[];
    onSelectNFT: (collectionId: string, tokenId: bigint) => void;
  }

  let {
    nfts,
    onSelectNFT,
  }: Props = $props();
</script>
<div>
  {#if nfts.length === 0}
    <div class="text-center py-8">
      <p class="text-gray-500 mb-4">
        {locale.t("wallet.noNFTsMsg")}
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-4">
      {#each nfts as nft (nft.collectionId + nft.tokenId.toString())}
        <NFTItem
          item={nft}
          onSelect={onSelectNFT}
        />
      {/each}
    </div>
  {/if}
</div>