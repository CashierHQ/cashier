<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { toggleToken, walletTokensQuery } from "$modules/token/state/tokenStore.svelte";
  import type { TokenWithPriceAndBalance } from '$modules/token/types';
  import { Principal } from '@dfinity/principal';

  let errorMessage: string =  $state("");
  let successMessage: string = $state("");

  async function handleToggle(token: TokenWithPriceAndBalance) {
    errorMessage = "";
    successMessage = "";

    try {
      const tokenPrincipal = Principal.fromText(token.address);
      await toggleToken(tokenPrincipal, !token.enabled);
      successMessage = "Token toggled successfully!";
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
  <h2>Manage tokens</h2>
  <div class="py-4">
    {#if errorMessage}
      <p style="color: red;">{errorMessage}</p>
    {/if}
    {#if successMessage}
      <p style="color: green;">{successMessage}</p>
    {/if}
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
  </div> 
</div>

