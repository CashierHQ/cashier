<script lang="ts">
  import { ManagedState, managedState } from "$lib/stores/managedState.svelte";
  import { tokenMetadataService } from "$modules/token/services/tokenMetadata";
  import type { TokenPrice } from "$modules/token/types";
  import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";

  interface Props {
    price: TokenPrice;
  }

  let data: Props = $props();

  let tokenMetadataQuery = managedState<IcrcTokenMetadata | undefined>({
    queryFn: async () => {
      return tokenMetadataService.getTokenMetadata(data.price.address);
    },
    // staleTime: 5_000,
    // refetchInterval: 10_000,
    // persistedKey: ["tokenMetadata", data.price.address],
  });
</script>

<li>
  {data.price.symbol} ({data.price.standard}): ${data.price.priceUSD.toFixed(5)}
  - metadata: -- QUERY 1:
  {#if tokenMetadataQuery.isLoading}
    Loading...
  {/if}
  {#if tokenMetadataQuery.error}
    Cannot fetch token metadata
    <!-- {$tokenMetadataQuery.error.message} -->
  {/if}
  {#if tokenMetadataQuery.isSuccess}
    decimals: {tokenMetadataQuery.data?.decimals} - fee: {tokenMetadataQuery
      .data?.fee}
  {/if}
</li>
