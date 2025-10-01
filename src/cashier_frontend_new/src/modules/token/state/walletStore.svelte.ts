import { managedState } from "$lib/managedState";
import { accountState } from "$modules/shared/state/auth.svelte";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { tokenPriceService } from "$modules/token/services/tokenPrice";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

/**
 * QueryState for fetching the user's wallet tokens along with their balances and prices.
 * This state combines data from the Token Storage canister, ICP Ledger canister, and token price service.
 * The result is an array of tokens with their metadata, balance in ICP, and USD price.
 */
export const walletTokensQuery = managedState<TokenWithPriceAndBalance[]>({
  queryFn: async () => {
    // fetch list user's tokens
    const tokens = await tokenStorageService.listTokens();

    // fetch token balances
    const balanceRequests = tokens.map((token) => {
      const icpLedgerService = new IcpLedgerService(token);
      return icpLedgerService.getBalance();
    });
    const balances: bigint[] = await Promise.all(balanceRequests);

    // fetch token prices
    const prices = await tokenPriceService.getTokenPrices();

    return tokens.map((token, index) => ({
      ...token,
      balance: balances[index],
      priceUSD: prices[token.address.toText()] || 0,
    }));
  },
  refetchInterval: 15_000, // Refresh every 5 seconds to keep balances up-to-date
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
