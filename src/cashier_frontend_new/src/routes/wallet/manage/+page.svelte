<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { toggleTokenEnabled, walletTokensQuery } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from '$modules/token/types';

  async function handleToggle(token: TokenWithPriceAndBalance) {
    // Here you would typically also update the backend or local storage
    // to persist the enabled/disabled state of the token.
    console.log(`Toggle Token ${token.symbol} to enabled: ${!token.enabled}`);

    await toggleTokenEnabled(token.address, false);
  }

</script>

<div class="py-6">
  <Button onclick={() => goto(resolve("/wallet"))}>Back to Wallet</Button>
  <Button onclick={() => goto(resolve("/wallet/addtoken"))}>Add Token</Button>
</div>

<div>
  <h2>Manage Tokens</h2>
  {#if walletTokensQuery.data}
    <div>
      <ul>
        {#each walletTokensQuery.data as token (token.address)}
          <li>
              <strong>{token.symbol}</strong> - {token.name} <br />
              Address: {token.address} <br />
              Decimals: {token.decimals} <br />
              <input type="checkbox" bind:checked={token.enabled} onchange={() => handleToggle(token)} /> Enabled
              <br />
          </li>
          <hr />
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

