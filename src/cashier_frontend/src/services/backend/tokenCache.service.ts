// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { TokenBalanceMap } from "@/types/fungible-token.speculative";
import TokenStorageService from "./tokenStorage.service";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";

const LAST_CACHE_TIME_KEY = "lastTokenBalanceCacheTime";
const LAST_CACHED_BALANCES_KEY = "lastCachedTokenBalances";
const CACHE_THRESHOLD_MS = 1 * 30 * 1000; // 30 second in milliseconds

class TokenCacheService {
    private TokenStorageService: TokenStorageService;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.TokenStorageService = new TokenStorageService(identity);
    }

    /**
     * Get the list of tokens from the registry
     */

    async cacheTokenBalances(balanceMap: TokenBalanceMap, userWallet: string) {
        const currentTime = Date.now();

        const cacheKey = `${LAST_CACHE_TIME_KEY}_${userWallet}`;
        const cacheTimeKey = `${LAST_CACHED_BALANCES_KEY}_${userWallet}`;

        const lastCacheTimeString = localStorage.getItem(cacheTimeKey);
        const lastCacheTime = lastCacheTimeString ? parseInt(lastCacheTimeString, 10) : 0;

        // Get the last cached balances
        const lastCachedBalancesString = localStorage.getItem(cacheKey);

        const lastCachedBalances: TokenBalanceMap = lastCachedBalancesString
            ? JSON.parse(lastCachedBalancesString, (key, value) => {
                  // Convert string back to bigint during parsing
                  if (key === "amount" && typeof value === "string") {
                      return BigInt(value);
                  }
                  return value;
              })
            : {};

        // Check if any balances have changed
        const balancesChanged = Object.keys(balanceMap).some((tokenId) => {
            const currentAmount = balanceMap[tokenId]?.amount;
            const lastAmount = lastCachedBalances[tokenId]?.amount;

            // If either amount is missing (undefined), consider it changed
            if (currentAmount === undefined || lastAmount === undefined) {
                return true;
            }
            // Compare as strings since bigint can't be directly compared with ===
            const hasChanged = currentAmount.toString() !== lastAmount.toString();

            return hasChanged;
        });

        const timeThresholdMet = currentTime - lastCacheTime > CACHE_THRESHOLD_MS;

        // Cache if either balances changed OR time threshold met
        if (balancesChanged || timeThresholdMet) {
            try {
                const balancesToCache = Object.entries(balanceMap)
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    .filter(([_, balance]) => balance.amount !== undefined)
                    .map(([tokenId, balance]) => ({
                        tokenId,
                        balance: balance.amount!,
                    }));

                if (balancesToCache.length > 0) {
                    // Save the current time
                    localStorage.setItem(cacheTimeKey, currentTime.toString());

                    // Save the current balances with special handling for bigint
                    const balanceMapJson = JSON.stringify(balanceMap, (key, value) => {
                        // Convert bigint to string for JSON serialization
                        if (typeof value === "bigint") {
                            return value.toString();
                        }
                        return value;
                    });

                    localStorage.setItem(cacheKey, balanceMapJson);

                    if (balancesChanged) {
                        await this.TokenStorageService.updateTokenBalances(balancesToCache);
                        // Check what was actually stored in localStorage
                    }

                    console.log("Cached balances:", balancesToCache);
                } else {
                    console.log("No balances to cache (all undefined)");
                }
            } catch (error) {
                console.error("Failed to cache balances:", error);
                // Continue even if caching fails
            }
        } else {
            console.log("No changes detected and time threshold not met - skipping cache update");
        }
    }
}

export default TokenCacheService;
