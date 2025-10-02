<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { transferToken, walletTokensQuery } from '$modules/token/state/tokenStore.svelte';
  import { balanceToIcp, icpToBalance } from '$modules/token/utils/converter';
  import { Principal } from '@dfinity/principal';

  let receiveAddress: string = $state("");
  let selectedToken: string = $state("");
  let errorMessage: string = $state("");
  let successMessage: string = $state("");
  let isSending: boolean = $state(false);
  let amount: number = $state(0);

  let maxAmount: number = $derived.by(() => {
    const token = walletTokensQuery.data?.find(t => t.address === selectedToken);
    if (token) {
      return balanceToIcp(token.balance, token.decimals);
    }
    return 0;
  });
  
  async function handleSend() {
    if (!selectedToken || selectedToken.trim() === "") {
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

    if (amount <= 0) {
      errorMessage = "Amount must be greater than zero.";
      return;
    }

    if (amount > maxAmount) {
      errorMessage = `Amount exceeds maximum balance of ${maxAmount}`;
      return;
    }

    errorMessage = "";
    successMessage = "";

    try {
      const tokenPrincipal = Principal.fromText(selectedToken);
      const receivePrincipal = Principal.fromText(receiveAddress);
      const balanceAmount = icpToBalance(amount, token.decimals);
      console.log("balanceAmount:", balanceAmount);
      isSending = true;
      await transferToken(tokenPrincipal, receivePrincipal, balanceAmount);
      isSending = false;
      successMessage = "Token sent successfully!";
    } catch (error) {
      errorMessage = "Send token error: " + error;
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
  <h2>Send token</h2>
  <div class="py-4">
    {#if errorMessage}
      <p style="color: red;">{errorMessage}</p>
    {/if}
    {#if successMessage}
      <p style="color: green;">{successMessage}</p>
    {/if}
    {#if isSending}
      <p>Sending...</p>
    {/if}
    <p>Select a token to send:</p>
    <select bind:value={selectedToken} style="border: 1px solid #ccc;">
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
    <input type="number" bind:value={amount} max={maxAmount} onchange={() => handleValidate()} style="border: 1px solid #ccc;" />
    <br/>

    <p>Receive address:</p>
    <input type="text" bind:value={receiveAddress} style="border: 1px solid #ccc;" />
  </div>
  <Button onclick={() => handleSend()}>Send</Button>

  
</div>