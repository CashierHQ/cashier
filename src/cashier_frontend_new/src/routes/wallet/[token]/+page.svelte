<script lang="ts">
  import { page } from "$app/state";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import {
    balanceToUSDValue,
    parseBalanceUnits,
  } from "$modules/token/utils/converter";

  let token = page.params.token || "empty";
  let tokenDetails = $derived(
    walletStore.query.data?.find((t) => t.address === token),
  );
</script>

<div>
  <h2>Token details</h2>
  {#if tokenDetails}
    <div>
      <p><strong>Name:</strong> {tokenDetails.name} ({tokenDetails.symbol})</p>
      <p><strong>Address:</strong> {tokenDetails.address}</p>
      <p><strong>Decimals:</strong> {tokenDetails.decimals}</p>
      <p>
        <strong>Balance:</strong>
        {parseBalanceUnits(tokenDetails.balance, tokenDetails.decimals).toFixed(
          5,
        )}
      </p>
      <p><strong>Price USD:</strong> ${tokenDetails.priceUSD.toFixed(5)}</p>
      <p>
        <strong>Value USD:</strong> ${balanceToUSDValue(
          tokenDetails.balance,
          tokenDetails.decimals,
          tokenDetails.priceUSD,
        ).toFixed(5)}
      </p>
    </div>
  {:else}
    <p style="color: red">No details found for this token.</p>
  {/if}
</div>
