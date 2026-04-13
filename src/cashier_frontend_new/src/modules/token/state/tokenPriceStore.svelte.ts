import { managedState } from "$lib/managedState";
import { icExplorerTokenPriceService } from "$modules/token/services/token_price/icExplorer";
import { icpswapTokenPriceService } from "$modules/token/services/token_price/icpswap";

class TokenPriceStore {
  #tokenPricesQuery;

  constructor() {
    this.#tokenPricesQuery = managedState<Record<string, number>>({
      queryFn: async () => {
        // Fetch prices from both services in parallel
        // then merge results with priority to icpswap
        const services = ["icExplorer", "icpswap"];
        const fetchingPriceTasks = [
          icExplorerTokenPriceService.getTokenPrices(),
          icpswapTokenPriceService.getTokenPrices(),
        ];

        const prices_results = await Promise.allSettled(fetchingPriceTasks);
        const prices: Record<string, number> = {};

        // update price in priority order icExplorer > icpswap
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

  /**
   * Get token price by canister id
   * @param id canister id
   * @returns token price in USD or null if not found
   */
  getTokenPriceByCanisterId(id: string): number | null {
    return this.#tokenPricesQuery.data
      ? (this.#tokenPricesQuery.data[id] ?? null)
      : null;
  }
}

export const tokenPriceStore = new TokenPriceStore();
