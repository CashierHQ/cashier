<script lang="ts">
    import TokenDetail from "$modules/token/components/tokenDetail.svelte";
    import { tokenMetadataService } from "$modules/token/services/tokenMetadata";
  import { tokenPriceService } from "$modules/token/services/tokenPrice";
  import type { TokenPrice } from "$modules/token/types";
    import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
  import { createQuery } from "@tanstack/svelte-query";

  // Create a query to fetch token prices using the TokenPriceService
  const tokenPriceQuery = createQuery<TokenPrice[]>({
    queryKey: ["tokenPrices"],
    queryFn: async () => {
      return tokenPriceService.getTokens();
    },
  });

  // Create a query to fetch token metadata
  const tokenMetadataQuery = (tokenAddress: string) => createQuery<IcrcTokenMetadata | undefined>({
    queryKey: ["tokenMetadata", tokenAddress],
    queryFn: async () => {
      return tokenMetadataService.getTokenMetadata(tokenAddress);
    },
  })

  const tokenMetadata = tokenMetadataQuery("tokenAddress");
  $tokenMetadata.isPending;
</script>

<div>
  {#if $tokenPriceQuery.isPending}
    Loading...
  {/if}
  {#if $tokenPriceQuery.error}
    An error has occurred:
    {$tokenPriceQuery.error.message}
  {/if}
  {#if $tokenPriceQuery.isSuccess}
    <div>
      <h2>Token Prices</h2>
      <ul>
        {#each $tokenPriceQuery.data.slice(0, 10) as token (token.address)}
          <TokenDetail price={token} />
        {/each}
      </ul>
    </div>
  {/if}
</div>
