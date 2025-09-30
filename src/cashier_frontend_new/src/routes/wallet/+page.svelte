<script lang="ts">
  import { resolve } from "$app/paths";
  import { walletTokensQuery } from "$modules/token/state/walletStore.svelte";
</script>

<p class="py-6"><a class="link" href={resolve("/")}>Go to Home</a></p>

<div>
  {#if walletTokensQuery.isLoading}
    Loading...
  {:else if walletTokensQuery.error}
    <p style="color: red;">
      An error has occurred:
      {walletTokensQuery.error}
    </p>
  {:else if walletTokensQuery.isSuccess && walletTokensQuery.data}
    <div>
      <h2>Wallet tokens</h2>
      <ul>
        {#each walletTokensQuery.data as token (token.address)}
          <li>
            <a href={resolve(`/wallet/${token.address}`)}>
              <strong>{token.symbol}</strong> - {token.name} <br />
              Address: {token.address} <br />
              Decimals: {token.decimals} <br />
              Balance: {token.balance.toString()} - Price: ${token.priceUSD.toFixed(
                5,
              )} <br />
              Value USD: ${(token.balance * token.priceUSD).toFixed(5)} <br />
            </a>
          </li>
          <hr />
        {/each}
      </ul>
    </div>
  {:else}
    <p style="color: red">No tokens found in wallet.</p>
  {/if}
</div>
