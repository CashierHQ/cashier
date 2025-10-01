<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { transferToken, walletTokensQuery } from '$modules/token/state/tokenStore.svelte';
  import { balanceToIcp, icpToBalance } from '$modules/token/utils/converter';
  import { Principal } from '@dfinity/principal';

  let receiveAddress: string = $state("");
  let selectedToken: Principal = $state(Principal.anonymous());
  let errorMessage: string = $state("");
  let amount: number = $state(0);

  let maxAmount: number = $derived.by(() => {
    const token = walletTokensQuery.data?.find(t => t.address === selectedToken);
    if (token) {
      return balanceToIcp(token.balance, token.decimals);
    }
    return 0;
  });
  
  async function handleSend() {
    if (selectedToken === Principal.anonymous()) {
      errorMessage = "Please select a token to send.";
      return;
    }

    if (!receiveAddress || receiveAddress.trim() === "") {
      errorMessage = "Please enter a valid receive address.";
      return;
    }

    const token = walletTokensQuery.data?.find(t => t.address === selectedToken);
    if (!token) {
      errorMessage = "Selected token not found.";
      return;
    }

    console.log(`Send token ${token} to address ${receiveAddress} with amount ${amount}`);

    try {
      const receivePrincipal = Principal.fromText(receiveAddress);
      const balanceAmount = icpToBalance(amount, token.decimals);
      await transferToken(selectedToken, receivePrincipal, balanceAmount);
    } catch (error) {
      errorMessage = "send token error: " + error;
    }
  }

  async function handleValidate() {
    errorMessage = "";
    if (amount > maxAmount) {
      errorMessage = `Amount exceeds maximum balance of ${maxAmount}`;
    }
  }
</script>

<div class="py-6">
  <Button onclick={() => goto(resolve("/wallet"))}>Back to Wallet</Button>
</div>

<div>
  <h2>Send Tokens</h2>
  <p>Select a token to send:</p>
  <select bind:value={selectedToken}>
    {#if walletTokensQuery.data}
      {#each walletTokensQuery.data as token (token.address)}
        {#if token.enabled}
          <option value={token.address}>{token.symbol} - {token.name}</option>
        {/if}
      {/each}
    {:else}
      <option disabled>No tokens available</option>
    {/if}
  </select>

  <p>Amount: (max {maxAmount})</p>
  <input type="number" bind:value={amount} max={maxAmount} onchange={() => handleValidate()}/>
  <br/>

  <p>Receive address:</p>
  <input type="text" bind:value={receiveAddress}/>
  <br/>

  <Button onclick={() => handleSend()}>Send</Button>

  {#if errorMessage}
    <p style="color: red;">{errorMessage}</p>
  {/if}
</div>