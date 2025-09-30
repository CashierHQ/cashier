import { managedState } from "$lib/managedState";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

export const listTokensQuery = managedState<TokenWithPriceAndBalance[]>({
  queryFn: async () => {
    const tokens = await tokenStorageService.listTokens();
    const balanceRequests = tokens.map((token) => {
      const icpLedgerService = new IcpLedgerService(token.address);
      return icpLedgerService.getBalance();
    });
    const balances = await Promise.all(balanceRequests);
    console.log("Balances fetched:", balances);

    return tokens.map((token, index) => ({
      ...token,
      balance: balances[index],
      priceUSD: 0, // Placeholder, replace with actual price fetching logic if needed
    }));
  },
  persistedKey: ["listTokensQuery"],
  storageType: "localStorage",
});
