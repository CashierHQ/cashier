<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { tokenPriceService } from "$modules/token/services/tokenPrice.svelte";
  import type { TokenPrice } from "$modules/token/types";
  import { createQuery } from "@tanstack/svelte-query";

  // Create a query to fetch token prices using the TokenPriceService
  const tokenQuery = createQuery<TokenPrice[]>({
    queryKey: ["tokenPrices"],
    queryFn: async () => {
      return tokenPriceService.getTokenPrices();
    },
  });

  $effect(() => {
    const unsub = tokenQuery.subscribe((v) => {
      console.log('Token Query State (sub):', v);
    });
    return () => unsub();
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
      <div class="flex items-center gap-4 mb-4">
        <h2>Token Prices</h2>
        <Button
          onclick={() => $tokenQuery.refetch()}
          disabled={$tokenQuery.isFetching}
        >
          {#if $tokenQuery.isFetching}
            Refetching...
          {:else}
            Refetch
          {/if}
        </Button>
      </div>
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
