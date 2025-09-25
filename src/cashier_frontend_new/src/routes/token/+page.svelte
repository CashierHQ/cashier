<script lang="ts" >
  import { TokenPriceService } from '$lib/modules/shared/services/tokenPrice.svelte';
  import type { TokenData } from '$lib/types';
  import { createQuery } from '@tanstack/svelte-query';
  import { getContext } from 'svelte';

  // Create a query to fetch token prices using the TokenPriceService
  const tokenPriceService = getContext<TokenPriceService>('tokenPriceService');
  const tokenQuery = createQuery<TokenData[]>({
    queryKey: ['tokenPrices'],
    queryFn: async () => {
      return tokenPriceService.getTokens();
    },
  });
</script>

  <div>
    {#if $tokenQuery.isPending}
      Loading...
    {/if}
    {#if $tokenQuery.error}
      An error has occurred:
      {$tokenQuery.error.message}
    {/if}
    {#if $tokenQuery.isSuccess}
      <div>
        <h2>Token Prices</h2>
        <ul>
          {#each $tokenQuery.data as token}
            <li>{token.name} ({token.symbol}): ${token.priceUSD}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
