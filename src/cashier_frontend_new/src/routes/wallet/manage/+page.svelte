<script lang="ts">
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { TokenMetadata } from "$modules/token/types";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";

  let errorMessage: string = $state("");
  let successMessage: string = $state("");

  async function handleToggle(token: TokenMetadata) {
    errorMessage = "";
    successMessage = "";

    try {
      await walletStore.toggleToken(token.address, !token.enabled);
      successMessage = "Token toggled successfully!";
    } catch (error) {
      errorMessage = "Failed to toggle token: " + error;
    }
  }
</script>

<RouteGuard>
  <ProtectedAuth>
    <NavBar />
    <div>
      {#if walletStore.allTokensQuery.data}
        <h2>Manage tokens</h2>
        <div class="py-4">
          {#if errorMessage}
            <p style="color: red;">{errorMessage}</p>
          {/if}
          {#if successMessage}
            <p style="color: green;">{successMessage}</p>
          {/if}
          <div>
            <ul>
              {#each walletStore.allTokensQuery.data as token (token.address)}
                <li>
                  <strong>{token.symbol}</strong> - {token.name} <br />
                  Address: {token.address} <br />
                  Decimals: {token.decimals} <br />
                  <input
                    type="checkbox"
                    checked={token.enabled}
                    disabled={token.is_default}
                    onchange={() => handleToggle(token)}
                  />
                  Enabled
                  <br />
                </li>
                <hr />
              {/each}
            </ul>
          </div>
        </div>
      {:else if walletStore.allTokensQuery.isSuccess}
        <p style="color: red">No tokens found in wallet.</p>
      {:else if walletStore.allTokensQuery.error}
        <p style="color: red;">
          An error has occurred:
          {walletStore.allTokensQuery.error}
        </p>
      {:else}
        Loading...
      {/if}
    </div>
  </ProtectedAuth>
</RouteGuard>
