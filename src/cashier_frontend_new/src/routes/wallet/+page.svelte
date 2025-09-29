<script lang="ts">
  import { resolve } from "$app/paths";
  import TokenDetail from "$modules/token/components/tokenDetail.svelte";
  import { tokenPriceQuery } from "$modules/token/state/tokenStore.svelte";
</script>

<p class="py-6"><a class="link" href={resolve("/")}>Go to Home</a></p>

<div>
  {#if tokenPriceQuery.isLoading}
    Loading...
  {/if}
  {#if tokenPriceQuery.error}
    An error has occurred:
    {tokenPriceQuery.error}
  {/if}
  {#if tokenPriceQuery.isSuccess && tokenPriceQuery.data}
    <div>
      <h2>Token Prices</h2>
      <ul>
        {#each tokenPriceQuery.data.slice(0, 10) as token (token.address)}
          <TokenDetail price={token} />
        {/each}
      </ul>
    </div>
  {/if}
</div>
