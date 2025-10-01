<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { toggleToken, walletTokensQuery } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from '$modules/token/types';

  let errorMessage: string =  $state("");

  async function handleToggle(token: TokenWithPriceAndBalance) {
    try {
      await toggleToken(token.address, !token.enabled);
      errorMessage = "";
    } catch (error) {
      errorMessage = "Failed to toggle token: " + error;
    }
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
              <input type="checkbox" checked={token.enabled} onchange={() => handleToggle(token)} /> Enabled
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
  {#if errorMessage}
    <p style="color: red;">{errorMessage}</p>
  {/if}
</div>

