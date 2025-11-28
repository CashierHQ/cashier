<script lang="ts">
  import { resolve } from "$app/paths";
  import {
    balanceToUSDValue,
    parseBalanceUnits,
  } from "$modules/shared/utils/converter";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
</script>

<RouteGuard>
  <ProtectedAuth>
    <NavBar />
    <div>
      {#if walletStore.query.data}
        <div>
          <h2>Wallet</h2>
          <ul>
            {#each walletStore.query.data as token (token.address)}
              {#if token.enabled}
                <li>
                  <a href={resolve(`/wallet/${token.address}`)}>
                    <strong>{token.symbol}</strong> - {token.name} <br />
                    Address: {token.address} <br />
                    Decimals: {token.decimals} <br />
                    Balance: {parseBalanceUnits(
                      token.balance,
                      token.decimals,
                    ).toFixed(5)} - Price: ${token.priceUSD.toFixed(5)} <br />
                    Value USD: ${balanceToUSDValue(
                      token.balance,
                      token.decimals,
                      token.priceUSD,
                    ).toFixed(5)} <br />
                  </a>
                </li>
                <hr />
              {/if}
            {/each}
          </ul>
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
  </ProtectedAuth>
</RouteGuard>
