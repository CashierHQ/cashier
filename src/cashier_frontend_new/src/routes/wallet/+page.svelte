<script lang="ts">
  import { resolve } from "$app/paths";
  import { accountState } from "$modules/shared/state/auth.svelte";
  import { walletTokensQuery } from '$modules/token/state/walletStore.svelte';

  $effect(() => {
    console.log("Account state changed, refreshing tokens...", $state.snapshot(accountState.account));
    walletTokensQuery.refresh();
  });
</script>

<p class="py-6"><a class="link" href={resolve("/")}>Go to Home</a></p>

<div>
  {#if walletTokensQuery.isLoading}
    Loading...
  {/if}
  {#if walletTokensQuery.error}
    <p style="color: red;">An error has occurred:
    {walletTokensQuery.error}</p>
  {/if}
  {#if walletTokensQuery.isSuccess && walletTokensQuery.data}
    <div>
      <h2>Wallet tokens</h2>
      <ul>
        {#each walletTokensQuery.data as token (token.address)}
          <li>
            <strong>{token.symbol}</strong> - {token.name} <br />
            Address: {token.address} <br />
            Decimals: {token.decimals} <br />
            Balance: {token.balance.toString()} - Price: ${token.priceUSD.toFixed(5)} <br />
            Value USD: ${(token.balance * token.priceUSD).toFixed(5)} <br />
          </li>
          <hr />
        {/each}
      </ul>
    </div>
  {/if}
</div>
