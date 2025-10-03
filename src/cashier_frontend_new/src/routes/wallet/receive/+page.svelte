<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { accountState } from "$modules/shared/state/auth.svelte";
  import { ACCOUNT_ID_TYPE, ICP_LEDGER_CANISTER_ID, PRINCIPAL_TYPE } from "$modules/token/constants";
  import { walletStore } from "$modules/token/state/walletStore.svelte";

  let selectedToken: string = $state(ICP_LEDGER_CANISTER_ID);
  let accountType: number = $state(PRINCIPAL_TYPE);

  // disable AccountID option if selectedToken is not ICP
  let disabledAccount: boolean = $derived.by(() => selectedToken !== ICP_LEDGER_CANISTER_ID);

  // force accountType to PRINCIPAL_TYPE if selectedToken is not ICP
  $effect(() => {
    if (selectedToken !== ICP_LEDGER_CANISTER_ID && accountType === ACCOUNT_ID_TYPE) {
      accountType = PRINCIPAL_TYPE;
    }
  });

  let receiveAddress: string = $derived.by(() => {
    if (accountType === PRINCIPAL_TYPE) {
      return accountState.account?.owner || "No principal";
    } else if (accountType === ACCOUNT_ID_TYPE && selectedToken === ICP_LEDGER_CANISTER_ID) {
      return accountState.icpAccountID() || "No ICP account";
    } else {
      return "No account available";
    }
  });
</script>

<div class="py-6">
  <Button onclick={() => goto(resolve("/wallet"))}>Back to Wallet</Button>
</div>

<div>
  {#if walletStore.query.data}
    <h2>Receive token</h2>
    <p>Select a token to receive:</p>
    <select bind:value={selectedToken} style="border: 1px solid #ccc;">
      {#each walletStore.query.data as token (token.address)}
        {#if token.enabled}
          <option value={token.address}>{token.symbol} - {token.name}</option>
        {/if}
      {/each}
    </select>
    <p>Receive address</p>
    <select bind:value={accountType} style="border: 1px solid #ccc;">
      <option value={PRINCIPAL_TYPE}>PrincipalID</option>
      <option value={ACCOUNT_ID_TYPE} disabled={disabledAccount}>AccountID</option>
    </select>
    <span><strong>{receiveAddress}</strong></span>
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
