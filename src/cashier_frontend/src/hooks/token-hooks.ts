import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Identity } from "@dfinity/agent";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { mapUserTokenToFungibleToken } from "@/types/token-store.type";
import TokenStorageService from "@/services/backend/tokenStorage.service";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";

// Centralized query keys for consistent caching
export const TOKEN_QUERY_KEYS = {
    all: ["tokens"] as const,
    list: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "list", principalId] as const,
    balances: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "balances", principalId] as const,
    preferences: (principalId?: string) =>
        [...TOKEN_QUERY_KEYS.all, "preferences", principalId] as const,
};
// Hook 1: Fetch basic token list
export function useTokenListQuery(identity: Identity | undefined) {
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.list(identity?.getPrincipal().toString()),
        queryFn: async () => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            const tokens = await tokenService.listTokens();

            // Initialize user tokens if none exist
            if (tokens.length === 0) {
                await tokenService.initializeUserTokens();
                return tokenService.listTokens();
            }

            console.log("Fetched tokens from backend", tokens);

            return tokens;
        },
        select: (data) => {
            // Transform to frontend model
            return data.map((token) => mapUserTokenToFungibleToken(token));
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!identity,
    });
}

// Hook 2: Fetch token balances
export function useTokenBalancesQuery(
    tokens: FungibleToken[] | undefined,
    identity: Identity | undefined,
) {
    const updateBalanceMutation = useUpdateBalanceMutation(identity);

    // Constants for localStorage
    const LAST_CACHE_TIME_KEY = "lastTokenBalanceCacheTime";
    const LAST_CACHED_BALANCES_KEY = "lastCachedTokenBalances";
    const CACHE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.balances(identity?.getPrincipal().toString()),
        queryFn: async () => {
            if (!identity || !tokens || tokens.length === 0) {
                return [];
            }

            const tokenUtilService = new TokenUtilService(identity);

            // Fetch balances in parallel (unchanged)
            const tokenPromises = tokens.map(async (token) => {
                try {
                    const balance = await tokenUtilService.balanceOf(token.address);

                    return {
                        ...token,
                        amount: balance,
                    };
                } catch (error) {
                    console.error(`Error fetching balance for ${token.address}:`, error);
                    return token; // Return token unchanged on error
                }
            });

            const tokensWithBalances = await Promise.all(tokenPromises);

            // Get the last cache time from localStorage
            const lastCacheTimeString = localStorage.getItem(LAST_CACHE_TIME_KEY);
            const lastCacheTime = lastCacheTimeString ? parseInt(lastCacheTimeString, 10) : 0;

            // Get the last cached balances
            const lastCachedBalancesString = localStorage.getItem(LAST_CACHED_BALANCES_KEY);
            const lastCachedBalances = lastCachedBalancesString
                ? JSON.parse(lastCachedBalancesString)
                : {};

            // Check if any balances have changed
            const balancesChanged = tokensWithBalances.some((token) => {
                const tokenId = token.address;
                const currentAmount = token.amount ? token.amount.toString() : "0";
                const lastAmount = lastCachedBalances[tokenId] || "0";

                return currentAmount !== lastAmount;
            });

            const currentTime = Date.now();
            const timeThresholdMet = currentTime - lastCacheTime > CACHE_THRESHOLD_MS;

            // Cache if either balances changed OR time threshold met
            if (balancesChanged || timeThresholdMet) {
                try {
                    const balancesToCache = tokensWithBalances
                        .filter((token) => token.amount !== undefined)
                        .map((token) => ({
                            tokenId: token.address,
                            balance: token.amount,
                        }));

                    if (balancesToCache.length > 0) {
                        // Update the backend
                        updateBalanceMutation.mutate(balancesToCache);

                        // Save the current time
                        localStorage.setItem(LAST_CACHE_TIME_KEY, currentTime.toString());

                        // Save the current balances
                        const balancesMap = balancesToCache.reduce(
                            (acc, { tokenId, balance }) => {
                                acc[tokenId] = balance.toString();
                                return acc;
                            },
                            {} as Record<string, string>,
                        );

                        localStorage.setItem(LAST_CACHED_BALANCES_KEY, JSON.stringify(balancesMap));

                        console.log(
                            `Caching balances to backend (${balancesChanged ? "balances changed" : "time threshold reached"})`,
                        );
                    }
                } catch (error) {
                    console.error("Failed to cache balances:", error);
                    // Continue even if caching fails
                }
            }

            return tokensWithBalances;
        },
        enabled: !!identity && !!tokens && tokens.length > 0,
        staleTime: 60 * 1000, // 1 minute (balances fetching frequency stays the same)
    });
}

// Add token mutation
export function useAddTokenMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: AddTokenInput) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            const res = await tokenService.addToken(input);
            console.log("Token added", res);
            return true;
        },
        onSuccess: () => {
            // Properly invalidate token queries
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.all, // Invalidate all token-related queries
            });

            // Or more specifically:
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.list(identity?.getPrincipal().toString()),
            });
        },
    });
}

export function useUpdateBalanceMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (balances: { tokenId: string; balance: bigint }[]) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            await tokenService.updateBulkTokenBalance(balances);
            return true;
        },
        onSuccess: () => {
            // Optionally invalidate queries if needed
            queryClient.invalidateQueries({ queryKey: TOKEN_QUERY_KEYS.all });
        },
    });
}

// Toggle token enabled mutation
export function useToggleTokenEnabledMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ tokenId, enabled }: { tokenId: string; enabled: boolean }) => {
            if (!identity) throw new Error("Not authentiated");

            const tokenService = new TokenStorageService(identity);
            // await tokenService.toggleTokenEnabled(tokenId, enabled);
            return true;
        },
        onSuccess: () => {
            // Invalidate token queries
            queryClient.invalidateQueries({ queryKey: TOKEN_QUERY_KEYS.all });
        },
    });
}
