import { managedState } from "$lib/managedState";
import { icExplorerTokenPriceService } from "../services/token_price/icExplorer";
import { kongSwapTokenPriceService } from "../services/token_price/kongSwap";

class TokenPriceStore {
  #tokenPricesQuery;

  constructor() {
    this.#tokenPricesQuery = managedState<Record<string, number>>({
      queryFn: async () => {
        // fetch token prices in parallel from icExplorer, kongSwap
        const services = ["kongSwap", "icExplorer"];
        const fetchingPriceTasks = [
          kongSwapTokenPriceService.getTokenPrices(),
          icExplorerTokenPriceService.getTokenPrices(),
        ];

        const prices_results = await Promise.allSettled(fetchingPriceTasks);
        const prices: Record<string, number> = {};

        // update price in priority order icExplorer > kongSwap
        for (let i = 0; i < prices_results.length; i++) {
          const result = prices_results[i];

          if (result.status === "fulfilled") {
            if (result.value.isOk()) {
              Object.assign(prices, result.value.unwrap());
            } else {
              console.error(
                "Failed to fetch token prices:",
                result.value.unwrapErr(),
                services[i],
              );
            }
          } else {
            console.error(
              "Failed to fetch token prices:",
              result.reason,
              services[i],
            );
          }
        }

        return prices;
      },
      refetchInterval: 60_000, // Refresh every 60 seconds to keep prices up-to-date
      persistedKey: ["tokenPricesQuery"],
      storageType: "localStorage",
    });
  }

  get query() {
    return this.#tokenPricesQuery;
  }
}

export const tokenPriceStore = new TokenPriceStore();
