<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { ACCOUNT_ID_TYPE, PRINCIPAL_TYPE } from '$modules/token/constants';
  import { walletStore } from '$modules/token/state/walletStore.svelte';
  import { balanceToIcp, icpToBalance } from '$modules/token/utils/converter';
  import { AccountIdentifier } from '@dfinity/ledger-icp';
  import { Principal } from '@dfinity/principal';

  let receiveAddress: string = $state("");
  let receiveType: number = $state(PRINCIPAL_TYPE);

  let selectedToken: string = $state("");
  let errorMessage: string = $state("");
  let successMessage: string = $state("");
  let isSending: boolean = $state(false);
  let amount: number = $state(0);

  let maxAmount: number = $derived.by(() => {
    const token = walletStore.query.data?.find(t => t.address === selectedToken);
    if (token) {
      return balanceToIcp(token.balance, token.decimals);
    }
    return 0;
  });
  
  async function handleSend() {
    errorMessage = "";
    successMessage = "";

    if (!validate()) {
      return;
    }

    try {
      const token = walletStore.findTokenByAddress(selectedToken);
      const balanceAmount = icpToBalance(amount, token.decimals);

      if (receiveType === PRINCIPAL_TYPE) {
        const receivePrincipal = Principal.fromText(receiveAddress);
        isSending = true;
        await walletStore.transferTokenToPrincipal(selectedToken, receivePrincipal, balanceAmount);
      } else if (receiveType === ACCOUNT_ID_TYPE) {
        const receiveAccount = AccountIdentifier.fromHex(receiveAddress);
        isSending = true;
        await walletStore.transferTokenToAccount(selectedToken, receiveAccount, balanceAmount);
      } else {
        errorMessage = "Invalid receive type selected.";
        return;
      }

      isSending = false;
      successMessage = "Token sent successfully!";
    } catch (error) {
      errorMessage = "Send token error: " + error;
    }
  }

  function validate(): boolean {
    errorMessage = "";

    if (!selectedToken || selectedToken.trim() === "") {
      errorMessage = "Please select a token to send.";
      return false;
    }

    if (!receiveAddress || receiveAddress.trim() === "") {
      errorMessage = "Please enter a valid receive address.";
      return false;
    }

    if (amount <= 0) {
      errorMessage = "Amount must be greater than zero.";
      return false;
    }

    if (amount > maxAmount) {
      errorMessage = `Amount exceeds maximum balance of ${maxAmount}`;
      return false;
    }

    return true;
  }
</script>

<div class="py-6">
  <Button onclick={() => goto(resolve("/wallet"))}>Back to Wallet</Button>
</div>

<div>
  {#if walletStore.query.data}
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
          {#each walletStore.query.data as token (token.address)}
            {#if token.enabled}
              <option value={token.address}>{token.symbol} - {token.name}</option>
            {/if}
          {/each}
      </select>
      <p>Amount: (max {maxAmount})</p>
      <input type="number" bind:value={amount} max={maxAmount} style="border: 1px solid #ccc;" />
      <br/>
      <p>Receive address:</p>
      <select bind:value={receiveType} style="border: 1px solid #ccc; margin-bottom: 8px;">
        <option value={0}>Principal</option>
        <option value={1}>AccountID</option>
      </select>
      <input type="text" bind:value={receiveAddress} style="border: 1px solid #ccc;" />
    </div>
    <Button onclick={() => handleSend()}>Send</Button>
  {:else if walletStore.query.isSuccess}
    <p style="color: red">No tokens found in wallet.</p>
  {:else if walletStore.query.error}
    <p style="color: red;">
      An error has occurred:
      {walletStore.query.error}
    </p>
  {:else}
    Loading...
  {/if}
</div>