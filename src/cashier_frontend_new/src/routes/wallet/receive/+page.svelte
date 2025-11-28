<script lang="ts">
  import { authState } from "$modules/auth/state/auth.svelte";
  import {
    ACCOUNT_ID_TYPE,
    ICP_LEDGER_CANISTER_ID,
    PRINCIPAL_TYPE,
  } from "$modules/token/constants";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";

  let selectedToken: string = $state(ICP_LEDGER_CANISTER_ID);
  let accountType: number = $state(PRINCIPAL_TYPE);

  // disable AccountID option if selectedToken is not ICP
  let disabledAccount: boolean = $derived.by(
    () => selectedToken !== ICP_LEDGER_CANISTER_ID,
  );

  // force accountType to PRINCIPAL_TYPE if selectedToken is not ICP
  $effect(() => {
    if (
      selectedToken !== ICP_LEDGER_CANISTER_ID &&
      accountType === ACCOUNT_ID_TYPE
    ) {
      accountType = PRINCIPAL_TYPE;
    }
  });

  let receiveAddress: string = $derived.by(() => {
    if (accountType === PRINCIPAL_TYPE) {
      return authState.account?.owner || "No principal";
    } else if (
      accountType === ACCOUNT_ID_TYPE &&
      selectedToken === ICP_LEDGER_CANISTER_ID
    ) {
      return walletStore.icpAccountID() || "No ICP account";
    } else {
      return "No account available";
    }
  });
</script>

<RouteGuard>
  <ProtectedAuth>
    <div>
      {#if walletStore.query.data}
        <h2>Receive token</h2>
        <p>Select a token to receive:</p>
        <select bind:value={selectedToken} style="border: 1px solid #ccc;">
          {#each walletStore.query.data as token (token.address)}
            {#if token.enabled}
              <option value={token.address}
                >{token.symbol} - {token.name}</option
              >
            {/if}
          {/each}
        </select>
        <p>Receive address</p>
        <select bind:value={accountType} style="border: 1px solid #ccc;">
          <option value={PRINCIPAL_TYPE}>PrincipalID</option>
          <option value={ACCOUNT_ID_TYPE} disabled={disabledAccount}
            >AccountID</option
          >
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
  </ProtectedAuth>
</RouteGuard>
