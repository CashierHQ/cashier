import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Identity } from "@dfinity/agent";
import {
    FungibleToken,
    TokenBalanceMap,
    TokenMetadataMap,
} from "@/types/fungible-token.speculative";
import { TokenUtilService } from "@/services/tokenUtils.service";
import {
    mapFiltersToUserFiltersInput,
    mapUserPreferenceToFilters,
    TokenFilters,
    mapTokenDtoToTokenModel,
} from "@/types/token-store.type";
import TokenStorageService from "@/services/backend/tokenStorage.service";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";
import tokenPriceService from "@/services/price/icExplorer.service";
import { useIdentity } from "@nfid/identitykit/react";
import TokenCacheService from "@/services/backend/tokenCache.service";
import { useEffect } from "react";

// Centralized query keys for consistent caching
export const TOKEN_QUERY_KEYS = {
    all: ["tokens"] as const,
    list: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "list", principalId] as const,
    metadata: () => [...TOKEN_QUERY_KEYS.all, "metadata"] as const,
    balances: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "balances", principalId] as const,
    preferences: (principalId?: string) =>
        [...TOKEN_QUERY_KEYS.all, "preferences", principalId] as const,
    prices: () => [...TOKEN_QUERY_KEYS.all, "prices"] as const,
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

            return tokens;
        },
        select: (data) => {
            // Transform to frontend model
            const res = data.map((token) => mapTokenDtoToTokenModel(token));
            return res;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!identity,
    });
}

export function useTokenMetadataQuery(tokens: FungibleToken[] | undefined) {
    const identity = useIdentity();

    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.metadata(),
        queryFn: async () => {
            if (!identity) throw new Error("Not authenticated");

            if (!tokens || tokens.length === 0) return {};

            // Create a map of token address to metadata
            const metadataMap: TokenMetadataMap = {};

            // Process tokens in batches to avoid overwhelming the network
            const batchSize = 5;
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);
                const batchPromises = batch.map(async (token) => {
                    try {
                        const metadata = await TokenUtilService.getTokenMetadata(token.address);
                        if (metadata) {
                            metadataMap[token.address] = {
                                fee: metadata.fee,
                            };
                        }
                        return { tokenId: token.address, metadata };
                    } catch (error) {
                        console.error(`Error fetching metadata for ${token.address}:`, error);
                        return { tokenId: token.address, metadata: null };
                    }
                });

                await Promise.all(batchPromises);
            }

            return metadataMap;
        },
        staleTime: 30 * 60 * 1000, // 30 minutes
        enabled: !!identity && !!tokens,
    });
}
// Hook 2: Fetch token balances
export function useTokenBalancesQuery(tokens: FungibleToken[] | undefined) {
    const identity = useIdentity();

    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.balances(identity?.getPrincipal().toString()),
        queryFn: async () => {
            if (!identity) {
                return [];
            }

            if (!tokens) {
                return [];
            }

            const tokenUtilService = new TokenUtilService(identity);

            // Create a balance map to track results
            const balanceMap: TokenBalanceMap = {};

            // Fetch balances in parallel
            const tokenPromises = tokens.map(async (token) => {
                try {
                    const balance = await tokenUtilService.balanceOf(token.address);

                    // Update the balance map
                    balanceMap[token.address] = { amount: balance };

                    return {
                        id: token.id,
                        address: token.address,
                        amount: balance,
                    };
                } catch (error) {
                    console.error(`Error fetching balance for ${token.address}:`, error);
                    return {
                        id: token.id,
                        address: token.address,
                        amount: 0n,
                    };
                }
            });

            const tokensWithBalances = await Promise.all(tokenPromises);

            // store the balance map in local storage and backend if changed or time threshold met
            new TokenCacheService(identity).cacheTokenBalances(
                balanceMap,
                identity.getPrincipal().toString(),
            );

            return tokensWithBalances;
        },
        enabled: !!identity && !!tokens,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 30 * 1000, // 30 seconds
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

// Improved hook for toggling token visibility
export function useToggleTokenVisibilityMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ tokenId, hidden }: { tokenId: string; hidden: boolean }) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            await tokenService.toggleTokenVisibility(tokenId, hidden);
            return { tokenId, hidden };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.preferences(identity?.getPrincipal().toString()),
            });
        },
    });
}

// Updated user preferences query hook
export function useUserPreferencesQuery(identity: Identity | undefined) {
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.preferences(identity?.getPrincipal().toString()),
        queryFn: async () => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            const preferences = await tokenService.getUserPreference();

            console.log("User preferences:", preferences);
            return mapUserPreferenceToFilters(preferences);
        },
        enabled: !!identity,
        staleTime: 60 * 60 * 1000, // 1 hour
    });
}

// Updated mutation hook for updating user filters
export function useUpdateUserFiltersMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (filters: TokenFilters) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            const input = mapFiltersToUserFiltersInput(filters);
            await tokenService.updateUserFilters(input);
            return filters;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.preferences(identity?.getPrincipal().toString()),
            });
        },
    });
}

export function useTokenPricesQuery() {
    const queryClient = useQueryClient();

    // Create the base query
    const query = useQuery({
        queryKey: TOKEN_QUERY_KEYS.prices(),
        queryFn: async ({ signal }) => {
            try {
                const prices = await tokenPriceService.getAllPrices();
                // Return null instead of empty object if no prices are fetched
                return Object.keys(prices).length > 0 ? prices : null;
            } catch (error) {
                console.error("Failed to fetch token prices:", error);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes cache
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff (30 seconds max)
    });

    // Add custom retry logic for empty responses (not error responses)
    useEffect(() => {
        // If we have no data but the query is successful (empty response)
        // and not already fetching, trigger a retry
        if (query.isSuccess && !query.data && !query.isFetching) {
            const timeoutId = setTimeout(() => {
                console.log("No price data received, retrying...");
                queryClient.invalidateQueries({ queryKey: TOKEN_QUERY_KEYS.prices() });
            }, 3000); // Retry after 3 seconds

            return () => clearTimeout(timeoutId);
        }
    }, [query.isSuccess, query.data, query.isFetching]);

    return query;
}
