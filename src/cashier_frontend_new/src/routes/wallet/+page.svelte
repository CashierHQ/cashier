<script lang="ts">
  import { resolve } from "$app/paths";
  import { listTokensQuery } from '$modules/wallet/state/walletStore.svelte';
  
  $effect(() => {
    listTokensQuery.refresh();
  });
</script>

<p class="py-6"><a class="link" href={resolve("/")}>Go to Home</a></p>

<div>
  {#if listTokensQuery.isLoading}
    Loading...
  {/if}
  {#if listTokensQuery.error}
    An error has occurred:
    {listTokensQuery.error}
  {/if}
  {#if listTokensQuery.isSuccess && listTokensQuery.data}
    <div>
      <h2>Token Prices</h2>
    
    </div>
  {/if}
</div>
