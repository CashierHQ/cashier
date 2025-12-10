<script lang="ts">
  import { authState } from '$modules/auth/state/auth.svelte';
  import { bitcoinStore } from '../bitcoinStore.svelte';

  let receiveAddress: string = $derived.by(() => {
      return authState.account?.owner || "No principal";
  });

  let btcAddress = $state("");
  $effect(() => {
    if (receiveAddress) {
      bitcoinStore.getBtcAddress(receiveAddress).then((address) => {
        btcAddress = address;
      });
    }
  })
</script>

<div>
  <p>PrincipalID: {receiveAddress}</p>
  <p>Bitcoin Address: {btcAddress}</p>
  {#if bitcoinStore.query.data}
  <div>
    <p>Select runes to import</p>
    <select style="border: 1px solid #ccc;">
      {#each bitcoinStore.query.data as token (token.token_id)}
        <option value={token.token_id}>
          {token.symbol} ({token.token_id} - Rune ID: {token.rune_id})
        </option>
      {/each}
    </select>
    <p>Amount:</p>
    <input type="number" min="0" style="border: 1px solid #ccc;" />
  </div>
    <button style="border: 1px solid #ccc;">Import Runes</button>
  {/if}
</div>