<script lang="ts">
    import { resolve } from "$app/paths";

    // import TokenDetail from "$modules/token/components/tokenDetail.svelte";
    import TokenDetail from "$modules/token/components/tokenDetail_new.svelte";
  import { tokenPriceService } from "$modules/token/services/tokenPrice";
  import type { TokenPrice } from "$modules/token/types";
  import { createQuery } from "@tanstack/svelte-query";

  // Create a query to fetch token prices using the TokenPriceService
  const tokenPriceQuery = createQuery<TokenPrice[]>({
    queryKey: ["tokenPrices"],
    queryFn: async () => {
      console.log("fetching token prices from react-query");
      return tokenPriceService.getTokens();
    },
    refetchInterval: 5_000,
  });


</script>

<p class="py-6"><a class="link" href={resolve("/")}>Go to Home</a></p>

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
