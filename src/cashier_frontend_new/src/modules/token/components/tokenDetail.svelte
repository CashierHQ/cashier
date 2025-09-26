<script lang="ts">
  import { tokenMetadataService } from "$modules/token/services/tokenMetadata";
  import type { TokenPrice } from "$modules/token/types";
  import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
  import { createQuery } from "@tanstack/svelte-query";

  interface Props {
    price: TokenPrice;
  }

  let data: Props = $props();

  // Create a query to fetch token metadata
  const tokenMetadataQuery = createQuery<IcrcTokenMetadata | undefined>({
    queryKey: ["tokenMetadata", data.price.address],
    queryFn: async () => {
      return tokenMetadataService.getTokenMetadata(data.price.address);
    },
  });

</script>

  <li>
    {data.price.symbol} ({data.price.standard}): ${data.price.priceUSD.toFixed(5)} - metadata: 

     {#if $tokenMetadataQuery.isPending}
      Loading...
    {/if}
{#if $tokenMetadataQuery.error}
    Cannot fetch token metadata
    <!-- {$tokenMetadataQuery.error.message} -->
  {/if}
  {#if $tokenMetadataQuery.isSuccess}
    decimals: {$tokenMetadataQuery.data?.decimals} - fee: {$tokenMetadataQuery.data?.fee} 
  {/if}

  </li>