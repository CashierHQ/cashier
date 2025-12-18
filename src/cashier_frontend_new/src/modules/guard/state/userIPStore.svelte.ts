import { managedState } from "$lib/managedState";
import countryBlacklist from "$modules/guard/data/blacklist.json";
import { queryUserCountryLocation } from "$modules/guard/services/ip_resolver";

export class UserIPStore {
  #ipLocationQuery;

  constructor() {
    this.#ipLocationQuery = managedState<string | null>({
      queryFn: async () => {
        try {
          const countryCode = await queryUserCountryLocation();
          return countryCode;
        } catch (error) {
          console.error("Error fetching user IP location:", error);
          return null;
        }
      },
      refetchInterval: 15_000, // Refresh every 15 seconds to keep location up-to-date
      persistedKey: ["ipLocationQuery"],
      storageType: "sessionStorage",
    });
  }

  get query() {
    return this.#ipLocationQuery;
  }

  get countryCode() {
    return this.#ipLocationQuery.data;
  }

  /**
   * Checks if the user's country code is in the blacklist.
   * @returns {boolean} True if the country code is blacklisted, false otherwise.
   */
  isBlacklisted(): boolean {
    const countryCode = this.countryCode;
    if (!countryCode) return false;

    return countryBlacklist.country_codes.includes(countryCode.toUpperCase());
  }
}

export const userIPStore = new UserIPStore();
