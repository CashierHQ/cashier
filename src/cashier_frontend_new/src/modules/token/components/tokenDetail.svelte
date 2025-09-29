<script lang="ts">
  import type { TokenPrice } from "$modules/token/types";
  import { tokenMetadataQuery } from "../stores/token.svelte";

  // DEMO: how to use managedState recursively

  interface Props {
    price: TokenPrice;
  }

  let data: Props = $props();

  const tokenMetadata = tokenMetadataQuery(data.price.address);
</script>

<li>
  {data.price.symbol} ({data.price.standard}): ${data.price.priceUSD.toFixed(5)}
  - metadata: -- QUERY 1:
  {#if tokenMetadata.isLoading}
    Loading...
  {/if}
  {#if tokenMetadata.error}
    Cannot fetch token metadata
    <!-- {$tokenMetadataQuery.error.message} -->
  {/if}
  {#if tokenMetadata.isSuccess}
    decimals: {tokenMetadata.data?.decimals} - fee: {tokenMetadata.data?.fee}
  {/if}
</li>
