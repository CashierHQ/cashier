<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { walletTokensQuery } from "$modules/token/state/walletStore.svelte";
  import {
    balanceToIcp,
    balanceToUSDValue,
  } from "$modules/token/utils/converter";

  let token = page.params.token || "empty";
  let tokenDetails = $derived(
    walletTokensQuery.data?.find((t) => t.address === token),
  );
</script>

<p class="py-6"><a class="link" href={resolve("/wallet")}>Go to Wallet</a></p>

<div>
  <h2>Token details</h2>
  {#if tokenDetails}
    <div>
      <p><strong>Name:</strong> {tokenDetails.name} ({tokenDetails.symbol})</p>
      <p><strong>Address:</strong> {tokenDetails.address}</p>
      <p><strong>Decimals:</strong> {tokenDetails.decimals}</p>
      <p>
        <strong>Balance:</strong>
        {balanceToIcp(tokenDetails.balance, tokenDetails.decimals).toFixed(5)}
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
