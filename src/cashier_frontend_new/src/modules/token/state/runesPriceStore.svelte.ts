import { managedState } from "$lib/managedState";
import { omnityTokenPriceService } from "$modules/token/services/token_price/omnity";

class RunesPriceStore {
  #runesPricesQuery;

  constructor() {
    this.#runesPricesQuery = managedState<Record<string, number>>({
      queryFn: async () => {
        const result = await omnityTokenPriceService.getTokenPrices();
        if (result.isOk()) {
          return result.unwrap();
        }
        console.error("Failed to fetch Rune prices:", result.unwrapErr());
        return {};
      },
      refetchInterval: 60_000,
      persistedKey: ["runesPricesQuery"],
      storageType: "localStorage",
    });
  }

  get query() {
    return this.#runesPricesQuery;
  }

  /**
   * Get Rune token price by Omnity token_id (e.g. "Bitcoin-runes-DOG•GO•TO•THE•MOON")
   * @param tokenId Omnity token identifier
   * @returns USD price or null if not available
   */
  getRunePrice(tokenId: string): number | null {
    return this.#runesPricesQuery.data?.[tokenId] ?? null;
  }
}

export const runesPriceStore = new RunesPriceStore();
