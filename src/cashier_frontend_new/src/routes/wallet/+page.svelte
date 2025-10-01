<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { walletTokensQuery } from "$modules/token/state/tokenStore.svelte";
  import {
      balanceToIcp,
      balanceToUSDValue,
  } from "$modules/token/utils/converter";
</script>

<div class="py-4">
  <Button onclick={() => goto(resolve("/"))}>Go to Home</Button>
  <Button onclick={() => goto(resolve("/wallet/manage"))}>
    Manage Tokens
  </Button>
  <Button onclick={() => goto(resolve("/wallet/send"))}>Send</Button>
  <Button onclick={() => goto(resolve("/wallet/receive"))}>Receive</Button>
</div>

<div>
  {#if walletTokensQuery.data}
    <div>
      <h2>Wallet tokens</h2>
      <ul>
        {#each walletTokensQuery.data as token (token.address)}
        {#if token.enabled}
          <li>
            <a href={resolve(`/wallet/${token.address}`)}>
              <strong>{token.symbol}</strong> - {token.name} <br />
              Address: {token.address} <br />
              Decimals: {token.decimals} <br />
              Balance: {balanceToIcp(token.balance, token.decimals).toFixed(5)} -
              Price: ${token.priceUSD.toFixed(5)} <br />
              Value USD: ${balanceToUSDValue(
                token.balance,
                token.decimals,
                token.priceUSD,
              ).toFixed(5)} <br />
            </a>
          </li>
          <hr />
        {/if}
      {/each}
      </ul>
    </div>
  {:else if walletTokensQuery.isSuccess}
    <p style="color: red">No tokens found in wallet.</p>
  {:else if walletTokensQuery.error}
    <p style="color: red;">
      An error has occurred:
      {walletTokensQuery.error}
    </p>
  {:else}
    Loading...
  {/if}
</div>
