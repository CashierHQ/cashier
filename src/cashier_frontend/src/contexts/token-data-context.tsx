// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { createContext, useContext, useEffect, ReactNode, useRef, useState } from "react";
import { useIdentity } from "@nfid/identitykit/react";
import { useTokenStore } from "@/stores/tokenStore";
import {
    useAddTokenMutation,
    useUpdateTokenEnableMutation,
    useTokenBalancesQuery,
    useTokenMetadataQuery,
    useTokenPricesQuery,
    useTokenListQuery,
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

    // Loading states
    isLoadingMetadata: boolean;
    isMetadataEnriched: boolean; // NEW: Flag to track if metadata enrichment is complete

    // Initial hash for comparison purposes
    initialTokenHash: string; // NEW: Hash of the very first token list loaded

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
    const [enrichedTokens, setEnrichedTokens] = useState<FungibleToken[]>([]);
    const [isMetadataEnriched, setIsMetadataEnriched] = useState<boolean>(false);
    const [initialTokenHash, setInitialTokenHash] = useState<string>("");
    const previousIdentityRef = useRef<typeof identity>(identity);

    // Helper function to create token hash
    const createTokenHash = (tokens: FungibleToken[]): string => {
        return tokens
            .map(
                (t) =>
                    `${t.id}-${t.symbol}-${t.name}-${t.decimals}-${t.enabled}-${t.fee || "no-fee"}-${t.logoFallback || "no-logo"}`,
            )
            .join("|");
    };

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
    const addTokenMutation = useAddTokenMutation();
    const addMultipleTokenMutation = useMultipleTokenMutation();
    const updateTokenEnableState = useUpdateTokenEnableMutation();

    // Backend operations - created once and shared
    const addToken = async (input: AddTokenInput) => {
        setIsImporting(true);
        try {
            console.log("[addToken] Adding token with input:", input);
            await addTokenMutation.mutateAsync(input);
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
        console.log("🔄 ENRICHMENT EFFECT RUNNING - Token list query data updated");
        if (!tokenListQuery.data) return;

        let currentTokens = [...tokenListQuery.data.tokens];

        // Set initial hash if this is the first time we get tokens (before any enrichment)
        if (initialTokenHash === "" && currentTokens.length > 0) {
            const firstHash = createTokenHash(currentTokens);
            console.log("🆕 Setting initial token hash:", firstHash);
            setInitialTokenHash(firstHash);
        }

        // 1. Enrich with balances if available
        if (tokenBalancesQuery.data) {
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
            console.log(
                "🔄 ENRICHING WITH METADATA - Token metadata query data:",
                tokenMetadataQuery.data,
            );
            currentTokens = currentTokens.map((token) => {
                const metadata = tokenMetadataQuery.data[token.address];
                if (metadata?.logo) {
                    return {
                        ...token,
                        logo: metadata.logo, // Assuming metadata has a 'logo' property
                    };
                }
                if (metadata?.fee !== undefined) {
                    return { ...token, fee: metadata.fee };
                }
                if (metadata?.decimals !== undefined) {
                    return { ...token, decimals: metadata.decimals };
                }
                if (metadata?.name) {
                    // Enrich with name and symbol if available
                    return {
                        ...token,
                        name: metadata.name,
                    };
                }
                if (metadata?.symbol) {
                    return {
                        ...token,
                        symbol: metadata.symbol,
                    };
                }
                return token;
            });
        }

        // Update metadata enriched flag
        const isCurrentlyEnriched =
            !!tokenMetadataQuery.data &&
            !tokenMetadataQuery.isLoading &&
            !tokenMetadataQuery.isFetching;
        setIsMetadataEnriched(isCurrentlyEnriched);

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

        // Update the enriched tokens state
        const previousLength = enrichedTokens.length;
        setEnrichedTokens(currentTokens);

        console.log("📊 Tokens updated:", {
            previousLength,
            newLength: currentTokens.length,
            hasMetadata: !!tokenMetadataQuery.data,
            hasBalances: !!tokenBalancesQuery.data,
            hasPrices: !!tokenPricesQuery.data,
            isMetadataEnriched: isCurrentlyEnriched,
        });

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
        setIsLoadingBalances(isLoadingBalancesState);
    }, [tokenBalancesQuery.isLoading, tokenBalancesQuery.isFetching, setIsLoadingBalances]);

    useEffect(() => {
        const isLoadingPricesState = tokenPricesQuery.isLoading || tokenPricesQuery.isFetching;
        setIsLoadingPrices(isLoadingPricesState);
    }, [tokenPricesQuery.isLoading, tokenPricesQuery.isFetching, setIsLoadingPrices]);

    useEffect(() => {
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
            setFilters(tokenListQuery.data.perference);
        }
    }, [setIsLoading, tokenListQuery.isFetching, tokenListQuery.data, setFilters]);

    // Refetch token list when identity changes
    useEffect(() => {
        // Identity changes are now handled automatically by React Query
        // through the query key that includes the principal ID
        if (identity !== previousIdentityRef.current) {
            previousIdentityRef.current = identity;
        }
    }, [identity]);

    // Context value
    const contextValue: TokenContextValue = {
        rawTokenList: enrichedTokens,
        isLoadingMetadata: tokenMetadataQuery.isLoading || tokenMetadataQuery.isFetching,
        isMetadataEnriched,
        initialTokenHash,
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
