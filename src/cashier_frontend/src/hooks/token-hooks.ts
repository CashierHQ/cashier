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
import {
    AddTokenInput,
    AddTokensInput,
    RegistryTokenDto,
} from "../../../declarations/token_storage/token_storage.did";
import tokenPriceService from "@/services/price/icExplorer.service";
import { useIdentity } from "@nfid/identitykit/react";
import TokenCacheService from "@/services/backend/tokenCache.service";

// Centralized time constants (in milliseconds)
const TIME_CONSTANTS = {
    // Cache durations
    FIVE_MINUTES: 5 * 60 * 1000,
    THIRTY_MINUTES: 30 * 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    THIRTY_SECONDS: 30 * 1000,

    // Retry intervals
    THREE_SECONDS: 3000,

    // Maximum retry delay
    MAX_RETRY_DELAY: 30000,
};

// Centralized query keys for consistent caching
export const TOKEN_QUERY_KEYS = {
    all: ["tokens"] as const,
    raw: () => [...TOKEN_QUERY_KEYS.all, "raw"] as const,
    list: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "list", principalId] as const,
    metadata: () => [...TOKEN_QUERY_KEYS.all, "metadata"] as const,
    balances: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "balances", principalId] as const,
    preferences: (principalId?: string) =>
        [...TOKEN_QUERY_KEYS.all, "preferences", principalId] as const,
    prices: () => [...TOKEN_QUERY_KEYS.all, "prices"] as const,
};

// This using for getting all tokens from the backend
export function useTokenRawListQuery() {
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.raw(),
        queryFn: async () => {
            const tokenService = new TokenStorageService();
            const tokens: RegistryTokenDto[] = await tokenService.listRegistryTokens();

            return tokens;
        },
        select: (data) => {
            // Transform to frontend model
            const res = data.map((token) => mapTokenDtoToTokenModel(token));
            return res;
        },
        staleTime: TIME_CONSTANTS.FIVE_MINUTES,
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
    });
}

// This is used for getting user's token list
export function useTokenListQuery(identity: Identity | undefined) {
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.list(identity?.getPrincipal().toString()),
        queryFn: async () => {
            const tokenService = new TokenStorageService(identity);
            let tokens: RegistryTokenDto[] = [];

            if (!identity) {
                // If no identity, return empty list for user tokens
                return [];
            } else {
                tokens = await tokenService.listTokens();
            }

            console.log(`[${new Date().toISOString()}] Fetched user tokens:`, tokens);

            // Initialize user tokens if none exist
            if (tokens.length === 0 && identity) {
                await tokenService.initializeUserTokens();
                const res = await tokenService.listTokens();
                console.log(
                    `[${new Date().toISOString()}] Fetched user tokens after initialization:`,
                    res,
                );

                return res;
            }

            return tokens;
        },
        select: (data) => {
            // Transform to frontend model
            const res = data.map((token) => mapTokenDtoToTokenModel(token));
            return res;
        },
        staleTime: TIME_CONSTANTS.FIVE_MINUTES,
        enabled: !!identity,
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
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
                                logo: metadata.icon,
                                decimals: metadata.decimals,
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
        staleTime: TIME_CONSTANTS.THIRTY_MINUTES,
        enabled: !!identity && !!tokens,
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
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

            // Store the balance map in local storage and backend if changed or time threshold met
            new TokenCacheService(identity).cacheTokenBalances(
                balanceMap,
                identity.getPrincipal().toString(),
            );

            return tokensWithBalances;
        },
        enabled: !!identity && !!tokens,
        staleTime: TIME_CONSTANTS.THIRTY_SECONDS,
        refetchInterval: TIME_CONSTANTS.THIRTY_SECONDS,
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
    });
}
// Add token mutation
export function useAddTokenMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: AddTokenInput) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            await tokenService.addToken(input);
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

// add mutliple tokens mutation
export function useAddTokensMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: AddTokensInput) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            console.log("input", input);
            try {
                await tokenService.addTokens(input);
                return true;
            } catch (error) {
                console.error("Error adding tokens:", error);
                throw error;
            }
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

            return mapUserPreferenceToFilters(preferences);
        },
        enabled: !!identity,
        staleTime: TIME_CONSTANTS.ONE_HOUR,
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
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.prices(),
        queryFn: async () => {
            try {
                const prices = await tokenPriceService.getAllPrices();
                // Return null instead of empty object if no prices are fetched
                console.log(`[${new Date().toISOString()}] Fetched token prices:`, prices);
                return Object.keys(prices).length > 0 ? prices : null;
            } catch (error) {
                console.error("Failed to fetch token prices:", error);
                throw error;
            }
        },
        staleTime: TIME_CONSTANTS.FIVE_MINUTES,
        refetchInterval: TIME_CONSTANTS.FIVE_MINUTES,
        retry: 10, // Retry failed requests up to 10 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
    });
}
