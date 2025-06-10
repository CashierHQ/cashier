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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Identity } from "@dfinity/agent";
import {
    FungibleToken,
    TokenBalanceMap,
    TokenMetadataMap,
} from "@/types/fungible-token.speculative";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { useTokenMetadataWorker } from "@/hooks/useTokenMetadataWorker";

import TokenStorageService from "@/services/backend/tokenStorage.service";
import {
    AddTokenInput,
    AddTokensInput,
    Chain,
    TokenDto,
    UpdateTokenStatusInput,
} from "../../../declarations/token_storage/token_storage.did";
import tokenPriceService from "@/services/price/icExplorer.service";
import { useIdentity } from "@nfid/identitykit/react";
import TokenCacheService from "@/services/backend/tokenCache.service";
import { mapTokenDtoToTokenModel, TokenFilters } from "@/types/token-store.type";
import { fromNullable } from "@dfinity/utils";
import { TOKEN_STORAGE_CANISTER_ID } from "@/const";

/**
 * Response from tokenListQuery with combined token list data
 */
export interface TokenListResponse {
    tokens: FungibleToken[];
    needUpdateVersion: boolean;
    perference: TokenFilters;
}

// Centralized time constants (in milliseconds)
const TIME_CONSTANTS = {
    ONE_MINUTE: 60 * 1000,
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
    metadata: () => [...TOKEN_QUERY_KEYS.all, "metadata"] as const,
    balances: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "balances", principalId] as const,
    prices: () => [...TOKEN_QUERY_KEYS.all, "prices"] as const,
};

/**
 * Converts a Chain object to its string representation
 *
 * @param chain - The Chain object (e.g. { 'IC': null })
 * @returns The string representation of the chain (e.g. "IC")
 */
export function chainToString(chain: Chain): string {
    // Get the first key of the object, which represents the chain name
    const chainKey = Object.keys(chain)[0];
    return chainKey || "";
}

export function useTokenListQuery() {
    const identity = useIdentity();
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.all,
        queryFn: async () => {
            console.log(
                "TokenStorageService initialized with canister:",
                TOKEN_STORAGE_CANISTER_ID,
            );
            const tokenService = new TokenStorageService(identity);
            let tokens: TokenDto[] = [];

            const res = await tokenService.listTokens();

            if (res && res.tokens) {
                tokens = res.tokens;
            }

            return {
                tokens,
                needUpdateVersion: res?.need_update_version || false,
                perference: fromNullable(res?.perference),
            };
        },
        select: (data): TokenListResponse => {
            // Transform to frontend model
            const tokens = data.tokens.map((token) => {
                return {
                    ...mapTokenDtoToTokenModel(token),
                    amount: fromNullable(token.balance),
                };
            });

            const perference: TokenFilters = {
                hideZeroBalance: data.perference?.hide_zero_balance || false,
                hideUnknownToken: data.perference?.hide_unknown_token || false,
                selectedChain:
                    data.perference?.selected_chain?.map((chain) => chainToString(chain)) || [],
            };

            return {
                tokens,
                needUpdateVersion: data.needUpdateVersion,
                perference: perference,
            };
        },
        staleTime: TIME_CONSTANTS.FIVE_MINUTES,
        // Improved refetching behavior
        refetchInterval: TIME_CONSTANTS.FIVE_MINUTES,
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
    });
}

export function useSyncTokenList(identity: Identity | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const tokenService = new TokenStorageService(identity);
            await tokenService.syncTokenList();
        },
        onSuccess: () => {
            // Properly invalidate token queries
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.all, // Invalidate all token-related queries
            });
        },
    });
}

export function useTokenMetadataQuery(tokens: FungibleToken[] | undefined) {
    const { metadataMap: workerMetadataMap, fetchMetadata } = useTokenMetadataWorker({
        onProgress: (processed, total) => {
            console.log(`Metadata fetching progress: ${processed}/${total}`);
        },
    });

    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.metadata(),
        queryFn: async () => {
            if (!tokens || tokens.length === 0) return {};

            try {
                // Use the worker to fetch metadata
                await fetchMetadata(tokens);

                // The result will be available in workerMetadataMap after the worker completes
                return workerMetadataMap;
            } catch (error) {
                console.error("Error using token metadata worker:", error);

                // Fallback to direct fetching in case worker fails
                console.warn("Falling back to direct metadata fetching");

                const metadataMap: TokenMetadataMap = {};
                const batchSize = 300;

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
                            console.error("Error fetching metadata for ${token.address}:", error);
                            return { tokenId: token.address, metadata: null };
                        }
                    });

                    await Promise.all(batchPromises);
                }

                return metadataMap;
            }
        },
        enabled: !!tokens,
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
        staleTime: TIME_CONSTANTS.THIRTY_MINUTES,
        refetchInterval: TIME_CONSTANTS.THIRTY_MINUTES,
    });
}

export function useTokenPricesQuery() {
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.prices(),
        queryFn: async () => {
            try {
                const prices = await tokenPriceService.getAllPrices();
                // Return null instead of empty object if no prices are fetched
                return Object.keys(prices).length > 0 ? prices : {};
            } catch (error) {
                console.error("Failed to fetch token prices:", error);
                throw error;
            }
        },
        staleTime: TIME_CONSTANTS.THIRTY_SECONDS,
        refetchInterval: TIME_CONSTANTS.THIRTY_SECONDS,
        retry: 10, // Retry failed requests up to 10 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 0.1 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
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

            const enableTokens = tokens.filter((token) => token.enabled);

            // Fetch balances in parallel
            const tokenPromises = enableTokens.map(async (token) => {
                try {
                    const balance = await tokenUtilService.balanceOf(token.address);

                    // Update the balance map

                    const id = `${token.chain}:${token.address}`;

                    balanceMap[id] = { amount: balance };

                    return {
                        id: id,
                        address: token.address,
                        amount: balance,
                    };
                } catch (error) {
                    console.error("Error fetching balance for ${token.address}:", error);
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
        },
    });
}

// add mutliple tokens mutation
export function useMultipleTokenMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: AddTokensInput) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
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
        },
    });
}

// Improved hook for toggling token visibility
export function useUpdateTokenStateMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ tokenId, enable }: { tokenId: string; enable: boolean }) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            const input: UpdateTokenStatusInput = {
                token_id: tokenId,
                is_enabled: enable,
            };
            await tokenService.updateToken(input);
            return { tokenId, hidden: enable };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.all,
            });
        },
    });
}
