// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Identity } from "@dfinity/agent";
import {
    FungibleToken,
    TokenBalanceMap,
    TokenMetadataMap,
} from "@/types/fungible-token.speculative";
import { TokenUtilService } from "@/services/tokenUtils.service";

import TokenStorageService from "@/services/backend/tokenStorage.service";
import {
    AddTokenInput,
    AddTokensInput,
    Chain,
    TokenDto,
    UpdateTokenInput,
} from "../generated/token_storage/token_storage.did";
import tokenPriceService from "@/services/price/icExplorer.service";
import { useIdentity } from "@nfid/identitykit/react";
import { mapTokenDtoToTokenModel, TokenFilters } from "@/types/token-store.type";
import { fromNullable } from "@dfinity/utils";
import { useTokenMetadataWorker } from "./token/useTokenMetadataWorker";
import { CHAIN } from "@/services/types/enum";

/**
 * Response from tokenListQuery with combined token list data
 */
interface TokenListResponse {
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
const TOKEN_QUERY_KEYS = {
    all: (principalId?: string) => ["tokens", principalId] as const,
    metadata: () => [...TOKEN_QUERY_KEYS.all(), "metadata"] as const,
    balances: (principalId?: string) =>
        [...TOKEN_QUERY_KEYS.all(principalId), "balances", principalId] as const,
    prices: () => ["tokens", "prices"] as const,
};

/**
 * Converts a Chain object to its string representation
 *
 * @param chain - The Chain object (e.g. { 'IC': null })
 * @returns The string representation of the chain (e.g. "IC")
 */
function chainToString(chain: Chain): string {
    // Get the first key of the object, which represents the chain name
    const chainKey = Object.keys(chain)[0];
    return chainKey || "";
}

export function useTokenListQuery() {
    const identity = useIdentity();
    const principalId = identity?.getPrincipal().toString();

    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.all(principalId),
        queryFn: async () => {
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
        enabled: !!identity, // Only run query when identity exists
        staleTime: TIME_CONSTANTS.FIVE_MINUTES,
        // Improved refetching behavior
        refetchInterval: TIME_CONSTANTS.FIVE_MINUTES,
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY), // Exponential backoff
    });
}

export function useTokenMetadataQuery(tokens: FungibleToken[] | undefined) {
    const { fetchMetadata } = useTokenMetadataWorker({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onProgress: (processed: any, total: any) => {
            console.log(`Metadata fetching progress: ${processed}/${total}`);
        },
    });

    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.metadata(),
        queryFn: async () => {
            if (!tokens || tokens.length === 0) return {};

            try {
                // Use the worker to fetch metadata - now returns a Promise
                const metadataMap = await fetchMetadata(tokens);
                console.log(
                    "[useTokenMetadataQuery] Worker completed with metadata:",
                    Object.keys(metadataMap).length,
                    "entries",
                );
                return metadataMap;
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
                                    name: metadata.name,
                                    symbol: metadata.symbol,
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

// Worker for fetching token balances
function useTokenBalancesWorker({
    onProgress,
}: {
    onProgress?: (processed: number, total: number) => void;
}) {
    const fetchBalances = async (tokens: FungibleToken[], identity: Identity) => {
        const tokenUtilService = new TokenUtilService(identity);
        const balanceMap: TokenBalanceMap = {};

        const tasks = tokens.map(async (token, index) => {
            try {
                const balance = await tokenUtilService.balanceOf(token.address);
                balanceMap[token.address] = { amount: balance };

                if (onProgress) {
                    onProgress(index + 1, tokens.length);
                }
            } catch (error) {
                console.error(`Error fetching balance for ${token.address}:`, error);
            }
        });

        await Promise.allSettled(tasks);

        return balanceMap;
    };

    return { fetchBalances };
}

// Hook 2: Fetch token balances
export function useTokenBalancesQuery(tokens: FungibleToken[] | undefined) {
    const identity = useIdentity();
    const { fetchBalances } = useTokenBalancesWorker({
        onProgress: (processed, total) => {
            console.log(`Balance fetching progress: ${processed}/${total}`);
        },
    });

    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.balances(identity?.getPrincipal().toString()),
        queryFn: async () => {
            if (!identity || !tokens) {
                return [];
            }

            const enableToken = tokens.filter((token) => token.enabled);

            const balanceMap = await fetchBalances(enableToken, identity);

            // Return the balances as an array
            return Object.entries(balanceMap).map(([address, balance]) => ({
                address,
                amount: balance.amount,
                chain: CHAIN.IC,
            }));
        },
        enabled: !!identity && !!tokens,
        staleTime: TIME_CONSTANTS.THIRTY_SECONDS,
        refetchInterval: TIME_CONSTANTS.THIRTY_SECONDS,
        retry: 3,
        retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, TIME_CONSTANTS.MAX_RETRY_DELAY),
    });
}
// Add token mutation
export function useAddTokenMutation() {
    const queryClient = useQueryClient();
    const identity = useIdentity();

    return useMutation({
        mutationFn: async (input: AddTokenInput) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            console.log("[addToken] Adding token with input 2:", input);
            const res = await tokenService.addToken(input);
            console.log("Token added:", res);
            return true;
        },
        onSuccess: () => {
            // Properly invalidate token queries using centralized key
            const principalId = identity?.getPrincipal().toString();
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.all(principalId),
            });
        },
    });
}

// add mutliple tokens mutation
export function useMultipleTokenMutation() {
    const queryClient = useQueryClient();
    const identity = useIdentity();

    return useMutation({
        mutationFn: async (input: AddTokensInput) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            try {
                console.log("Adding tokens:", input.token_ids.length);
                await tokenService.addTokens(input);
                return true;
            } catch (error) {
                console.error("Error adding tokens:", error);
                throw error;
            }
        },
        onSuccess: () => {
            // Properly invalidate token queries using centralized key
            const principalId = identity?.getPrincipal().toString();
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.all(principalId),
            });
        },
    });
}

// Improved hook for toggling token visibility
export function useUpdateTokenEnableMutation() {
    const queryClient = useQueryClient();
    const identity = useIdentity();

    return useMutation({
        mutationFn: async ({ tokenId, enable }: { tokenId: string; enable: boolean }) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            const input: UpdateTokenInput = {
                token_id: tokenId,
                is_enabled: enable,
            };
            await tokenService.updateTokenEnable(input);
            return { tokenId, hidden: enable };
        },
        onSuccess: () => {
            // Properly invalidate token queries using centralized key
            const principalId = identity?.getPrincipal().toString();
            queryClient.invalidateQueries({
                queryKey: TOKEN_QUERY_KEYS.all(principalId),
            });
        },
    });
}
