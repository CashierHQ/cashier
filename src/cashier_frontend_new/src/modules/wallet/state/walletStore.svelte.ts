import { managedState } from "$lib/managedState";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { tokenPriceService } from "$modules/token/services/tokenPrice";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

export const listTokensQuery = managedState<TokenWithPriceAndBalance[]>({
  queryFn: async () => {
    const tokens = await tokenStorageService.listTokens();

    // fetch token balances
    const balanceRequests = tokens.map((token) => {
      const icpLedgerService = new IcpLedgerService(token);
      return icpLedgerService.getBalance();
    });
    const balances = await Promise.all(balanceRequests);
    console.log("Balances fetched:", balances);

    // fetch token prices
    const prices = await tokenPriceService.getTokenPrices();
    console.log("Prices fetched:", prices);

    return tokens.map((token, index) => ({
      ...token,
      balance: balances[index],
      priceUSD: prices[token.address] || 0,
    }));
  },
  persistedKey: ["listTokensQuery"],
  storageType: "localStorage",
});
