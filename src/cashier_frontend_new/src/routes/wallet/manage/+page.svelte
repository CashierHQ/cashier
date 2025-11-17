<script lang="ts">
  import { walletStore } from "../../../../../../token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from "../../../../../../token/types";

  let errorMessage: string = $state("");
  let successMessage: string = $state("");

  async function handleToggle(token: TokenWithPriceAndBalance) {
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

<div>
  {#if walletStore.query.data}
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
          {#each walletStore.query.data as token (token.address)}
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
