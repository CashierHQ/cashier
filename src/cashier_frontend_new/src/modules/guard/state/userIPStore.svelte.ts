import { managedState } from "$lib/managedState";
import { PROTECTED_IP_BLOCKING_ENABLE } from "$modules/guard/constants";
import countryBlacklist from "$modules/guard/data/blacklist.json";
import { queryUserCountryLocation } from "$modules/guard/services/ip_resolver";

/**
 * Store to manage user's IP location and blacklist status.
 */
export class UserIPStore {
  #ipLocationQuery;
  #enabled;

  constructor(enabled: boolean = PROTECTED_IP_BLOCKING_ENABLE) {
    this.#enabled = enabled;
    this.#ipLocationQuery = managedState<string | null>({
      queryFn: async () => {
        try {
          if (!this.#enabled) {
            return null;
          }
          const countryCode = await queryUserCountryLocation();
          return countryCode;
        } catch (error) {
          console.error("Error fetching user IP location:", error);
          return null;
        }
      },
    });
  }

  get query() {
    return this.#ipLocationQuery;
  }

  get enabled() {
    return this.#enabled;
  }

  get countryCode() {
    return this.#ipLocationQuery.data;
  }

  /**
   * Checks if the user's country code is in the blacklist.
   * @returns {boolean} True if the country code is blacklisted, false otherwise.
   */
  isBlacklisted(): boolean {
    if (!this.#enabled) {
      return false;
    }

    const countryCode = this.countryCode;
    if (!countryCode) return false;

    return countryBlacklist.country_codes.includes(countryCode.toUpperCase());
  }
}

export const userIPStore = new UserIPStore();
