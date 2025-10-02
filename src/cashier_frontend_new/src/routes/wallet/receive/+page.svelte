<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { accountState } from '$modules/shared/state/auth.svelte';
  import { walletStore } from '$modules/token/state/walletStore.svelte';

  let selectedToken: string = $state("");

</script>

<div class="py-6">
  <Button onclick={() => goto(resolve("/wallet"))}>Back to Wallet</Button>
</div>

<div>
  <h2>Receive token</h2>
  <p>Select a token to receive:</p>
  <select bind:value={selectedToken} style="border: 1px solid #ccc;"> 
    {#if walletStore.query.data}
      {#each walletStore.query.data as token (token.address)}
        {#if token.enabled}
          <option value={token.address}>{token.symbol} - {token.name}</option>
        {/if}
      {/each}
    {:else}
      <option disabled>No tokens available</option>
    {/if}
  </select>
  <p>Receive address</p>
  <p>PrincipalID: <strong>{ accountState.account?.owner }</strong></p>
  <p>AccountID: <strong>{ accountState.getLedgerAccount() }</strong></p>

</div>