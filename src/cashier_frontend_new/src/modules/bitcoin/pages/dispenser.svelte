<script lang="ts">
  import { authState } from '$modules/auth/state/auth.svelte';
  import { bitcoinStore } from '../bitcoinStore.svelte';

  let receiveAddress: string = $derived.by(() => {
      return authState.account?.owner || "No principal";
  });
</script>

<div>
  PrincipalID: {receiveAddress}

  {#if bitcoinStore.query.data}
    {#each bitcoinStore.query.data as token (token.token_id)}
      <div>
        <h3>{token.symbol} ({token.token_id})</h3>
        <p>Decimals: {token.decimals}</p>
        <p>Rune ID: {token.rune_id}</p>
      </div>
      <hr />
    {/each}
  {/if}
</div>