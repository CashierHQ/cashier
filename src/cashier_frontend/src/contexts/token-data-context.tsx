// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { createContext, useContext, useEffect, ReactNode, useRef } from "react";
import { useIdentity } from "@nfid/identitykit/react";
import { useTokenStore } from "@/stores/tokenStore";
import {
    useAddTokenMutation,
    useUpdateTokenEnableMutation,
    useTokenBalancesQuery,
    useTokenMetadataQuery,
    useTokenPricesQuery,
    useTokenListQuery,
    useSyncTokenList,
    useMultipleTokenMutation,
} from "../hooks/token-hooks";
import { ICExplorerService, IcExplorerTokenDetail } from "@/services/icExplorer.service";
import { FungibleToken } from "@/types/fungible-token.speculative";
import {
    AddTokenInput,
    AddTokensInput,
} from "../../../declarations/token_storage/token_storage.did";

// Context for enriched token data and operations
interface TokenContextValue {
    // Enriched token data
    rawTokenList: FungibleToken[];

    // Backend operations
    addToken: (input: AddTokenInput) => Promise<void>;
    toggleTokenEnable: (tokenId: string, enable: boolean) => Promise<void>;
    updateTokenInit: () => Promise<void>;
    updateTokenExplorer: () => Promise<void>;
    updateTokenBalance: () => Promise<void>;
}

const TokenContext = createContext<TokenContextValue | null>(null);

// Provider component that manages all React Query hooks and data enrichment
export function TokenDataProvider({ children }: { children: ReactNode }) {
    const identity = useIdentity();
    const enrichedTokensRef = useRef<FungibleToken[]>([]);

    // Get Zustand store actions
    const {
        setIsLoading,
        setIsLoadingBalances,
        setIsLoadingPrices,
        setIsSyncPreferences,
        setIsImporting,
        setFilters,
        setError,
        setHasBalances,
    } = useTokenStore();

    // React Query hooks - only called once at the provider level
    const tokenListQuery = useTokenListQuery();
    const tokenMetadataQuery = useTokenMetadataQuery(tokenListQuery.data?.tokens);
    const tokenBalancesQuery = useTokenBalancesQuery(tokenListQuery.data?.tokens);
    const tokenPricesQuery = useTokenPricesQuery();

    // Mutations - only created once at the provider level
    const syncTokenListMutation = useSyncTokenList(identity);
    const addTokenMutation = useAddTokenMutation(identity);
    const addMultipleTokenMutation = useMultipleTokenMutation(identity);
    const updateTokenEnableState = useUpdateTokenEnableMutation(identity);

    // Backend operations - created once and shared
    const addToken = async (input: AddTokenInput) => {
        setIsImporting(true);
        try {
            await addTokenMutation.mutateAsync(input);
            await tokenListQuery.refetch();
        } catch (error) {
            setError(error as Error);
        } finally {
            setIsImporting(false);
        }
    };

    const toggleTokenEnable = async (tokenId: string, enable: boolean) => {
        setIsSyncPreferences(true);
        try {
            await updateTokenEnableState.mutateAsync({ tokenId, enable });
            await tokenListQuery.refetch();
            await tokenBalancesQuery.refetch();
        } catch (error) {
            setError(error as Error);
        } finally {
            setIsSyncPreferences(false);
        }
    };

    const updateTokenInit = async () => {
        try {
            await tokenListQuery.refetch();
        } catch (error) {
            setError(error as Error);
        }
    };

    const updateTokenExplorer = async () => {
        const explorerService = new ICExplorerService();
        if (!identity) {
            console.error("No identity found");
            return;
        }

        // Add retry logic for getting token list
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1 second delay between retries

        const getTokenListWithRetry = async (
            retries: number = 0,
        ): Promise<IcExplorerTokenDetail[]> => {
            try {
                const result = await explorerService.getListToken();
                console.log(`Successfully retrieved token list with ${result.length} items`);
                return result;
            } catch (error) {
                if (retries < MAX_RETRIES) {
                    const delay = RETRY_DELAY * Math.pow(2, retries);
                    console.log(`Attempt ${retries + 1} failed, retrying in ${delay}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    return getTokenListWithRetry(retries + 1);
                } else {
                    console.error(`Failed to get token list after ${MAX_RETRIES} attempts:`, error);
                    return [];
                }
            }
        };

        try {
            const tokenList = await getTokenListWithRetry();
            if (tokenList.length > 0) {
                const tokenIds = tokenList.map((token) => `IC:${token.ledgerId}`);
                const addTokensInput: AddTokensInput = { token_ids: tokenIds };
                await addMultipleTokenMutation.mutateAsync(addTokensInput);
                await tokenListQuery.refetch();
            }
        } catch (error) {
            console.error("Error updating token explorer:", error);
            setError(error as Error);
        }
    };

    const updateTokenBalance = async () => {
        try {
            await tokenBalancesQuery.refetch();
        } catch (error) {
            setError(error as Error);
        }
    };

    // Combined enrichment effect that handles all data stages
    useEffect(() => {
        console.log("Token list query data updated:", tokenListQuery.data);
        if (!tokenListQuery.data) return;

        let currentTokens = [...tokenListQuery.data.tokens];

        // 1. Enrich with balances if available
        if (tokenBalancesQuery.data) {
            console.log("Token balances query data:", tokenBalancesQuery.data);
            console.log("Current tokens length:", currentTokens.length);
            console.log(
                "Current tokens enable length:",
                currentTokens.filter((t) => t.enabled).length,
            );

            const balanceMap: Record<string, bigint | undefined> = {};
            tokenBalancesQuery.data.forEach((balance) => {
                if (balance.address && balance.amount !== undefined) {
                    balanceMap[balance.address] = balance.amount;
                }
            });

            currentTokens = currentTokens.map((token) => {
                const amount = balanceMap[token.address];
                if (amount !== undefined) {
                    return { ...token, amount };
                }
                return token;
            });
        }

        // 2. Enrich with metadata if available
        if (tokenMetadataQuery.data) {
            console.log("Token metadata query data:", tokenMetadataQuery.data);
            currentTokens = currentTokens.map((token) => {
                const metadata = tokenMetadataQuery.data[token.address];
                if (metadata?.fee !== undefined) {
                    return {
                        ...token,
                        fee: metadata.fee,
                        logoFallback: metadata.logo,
                    };
                }
                return token;
            });
        }

        // 3. Enrich with prices if available
        if (tokenPricesQuery.data) {
            console.log("Token prices query data:", tokenPricesQuery.data);
            currentTokens = currentTokens.map((token) => {
                const price = tokenPricesQuery.data[token.address];
                if (price) {
                    const enrichedToken = {
                        ...token,
                        usdConversionRate: price,
                    };

                    if (token.amount) {
                        const amountInNumber = Number(token.amount) / Math.pow(10, token.decimals);
                        enrichedToken.usdEquivalent = price * amountInNumber;
                    } else {
                        enrichedToken.usdEquivalent = 0;
                    }

                    return enrichedToken;
                }
                return token;
            });
        }

        // Update the enriched tokens ref
        enrichedTokensRef.current = currentTokens;

        // Update hasBalances in the store
        const hasBalances = currentTokens.some((token) => token.amount && token.amount > BigInt(0));
        setHasBalances(hasBalances);
    }, [
        tokenListQuery.data,
        tokenBalancesQuery.data,
        tokenMetadataQuery.data,
        tokenPricesQuery.data,
        setHasBalances,
    ]);

    // Loading state effects
    useEffect(() => {
        const isLoadingBalancesState =
            tokenBalancesQuery.isLoading || tokenBalancesQuery.isFetching;
        console.log("Is loading balances state:", isLoadingBalancesState);
        setIsLoadingBalances(isLoadingBalancesState);
    }, [tokenBalancesQuery.isLoading, tokenBalancesQuery.isFetching, setIsLoadingBalances]);

    useEffect(() => {
        const isLoadingPricesState = tokenPricesQuery.isLoading || tokenPricesQuery.isFetching;
        console.log("Is loading prices state:", isLoadingPricesState);
        setIsLoadingPrices(isLoadingPricesState);
    }, [tokenPricesQuery.isLoading, tokenPricesQuery.isFetching, setIsLoadingPrices]);

    useEffect(() => {
        console.log("Token list query fetching state:", tokenListQuery.isFetching);
        if (tokenListQuery.isFetching && !tokenListQuery.data) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }

        // if (tokenListQuery.data?.needUpdateVersion) {
        //     console.log("Syncing token list due to version update.");
        //     syncTokenListMutation.mutateAsync();
        // }

        if (tokenListQuery.data?.perference) {
            console.log(
                "Setting filters from token list query preferences:",
                tokenListQuery.data.perference,
            );
            setFilters(tokenListQuery.data.perference);
        }
    }, [setIsLoading, tokenListQuery.isFetching]);

    // Refetch token list when identity changes
    useEffect(() => {
        if (identity) {
            console.log("Identity changed, refetching token list");
            tokenListQuery.refetch();
        }
    }, [identity]);

    // Context value
    const contextValue: TokenContextValue = {
        rawTokenList: enrichedTokensRef.current,
        addToken,
        toggleTokenEnable,
        updateTokenInit,
        updateTokenExplorer,
        updateTokenBalance,
    };

    return <TokenContext.Provider value={contextValue}>{children}</TokenContext.Provider>;
}

// Hook to access token data and operations
export function useTokenData() {
    const context = useContext(TokenContext);
    if (!context) {
        throw new Error("useTokenData must be used within a TokenDataProvider");
    }
    return context;
}
