import { managedState } from "$lib/managedState";
import { accountState } from "$modules/shared/state/auth.svelte";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { tokenPriceService } from "$modules/token/services/tokenPrice";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { Principal } from "@dfinity/principal";

/**
 * QueryState for fetching the user's wallet tokens along with their balances and prices.
 * This state combines data from the Token Storage canister, ICP Ledger canister, and token price service.
 * The result is an array of tokens with their metadata, balance in ICP, and USD price.
 */
export const walletTokensQuery = managedState<TokenWithPriceAndBalance[]>({
  queryFn: async () => {
    // fetch list user's tokens
    const tokens = await tokenStorageService.listTokens();
    console.log("Fetched tokens", tokens);

    // fetch token balances
    const balanceRequests = tokens.map((token) => {
      const icpLedgerService = new IcpLedgerService(token.address);
      return icpLedgerService.getBalance();
    });
    const balances: bigint[] = await Promise.all(balanceRequests);

    // fetch token prices
    const prices = await tokenPriceService.getTokenPrices();

    const enrichedTokens = tokens.map((token, index) => ({
      ...token,
      balance: balances[index],
      priceUSD: prices[token.address.toText()] || 0,
    }));

    // sort by address
    enrichedTokens.sort((a, b) =>
      a.address.toText().localeCompare(b.address.toText()),
    );

    return enrichedTokens;
  },
  //refetchInterval: 15_000, // Refresh every 15 seconds to keep balances up-to-date
  persistedKey: ["walletTokensQuery"],
  //storageType: "localStorage", // disable persisting to localStorage to avoid the error:DevalueError: Cannot stringify arbitrary non-POJOs
});

$effect.root(() => {
  $effect(() => {
    console.log(
      "Account state changed, refreshing tokens...",
      $state.snapshot(accountState.account),
    );
    // Reset the wallet tokens data when user logs out
    if (accountState.account == null) {
      walletTokensQuery.reset();
      return;
    }
    // Refresh the wallet tokens data when user logs in
    walletTokensQuery.refresh();
  });
});

export async function toggleToken(address: Principal, isEnabled: boolean) {
  try {
    console.log("Toggling token:", address, "to", isEnabled);
    const toggleRes = await tokenStorageService.toggleToken(address, isEnabled);
    console.log("Toggled token response:", toggleRes);
    // Refresh the wallet tokens data after toggling the token enabled state
    walletTokensQuery.refresh();
  } catch (error) {
    console.error("Error toggling token enabled state:", error);
  }
}

export async function addToken(address: Principal) {
  try {
    console.log("Adding token:", address);
    const addRes = await tokenStorageService.addToken(address);
    console.log("Added token:", addRes);
    // Refresh the wallet tokens data after adding a new token
    walletTokensQuery.refresh();
  } catch (error) {
    console.error("Error adding token:", error);
  }
}
