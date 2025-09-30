<script lang="ts">
  import { resolve } from "$app/paths";
  import { accountState } from "$modules/shared/state/auth.svelte";
  import { listTokensQuery } from '$modules/wallet/state/walletStore.svelte';
  
  $effect(() => {
    listTokensQuery.refresh();
  });

  $effect(() => {
    console.log("Account state changed:", accountState.account);
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
      <h2>Wallet Tokens</h2>
      <ul>
        {#each listTokensQuery.data as token (token.address)}
          <li>
            <strong>{token.symbol}</strong> - {token.name} <br />
            Address: {token.address} <br />
            Standard: {token.standard} <br />
          </li>
          <hr />
        {/each}
      </ul>
    </div>
  {/if}
</div>
