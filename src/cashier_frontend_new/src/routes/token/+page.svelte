<script lang="ts">
  import { tokenPriceService } from "$lib/modules/token/services/tokenPrice.svelte";
  import type { TokenPrice } from "$lib/modules/token/types";
  import { createQuery } from "@tanstack/svelte-query";

  // Create a query to fetch token prices using the TokenPriceService
  const tokenQuery = createQuery<TokenPrice[]>({
    queryKey: ["tokenPrices"],
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
        {#each $tokenQuery.data as token (token.address)}
          <li>
            {token.symbol} ({token.standard}): ${token.priceUSD.toFixed(5)}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
