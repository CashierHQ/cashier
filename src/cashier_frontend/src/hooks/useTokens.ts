// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect } from "react";
import { useIdentity } from "@nfid/identitykit/react";
import { useTokenStore } from "@/stores/tokenStore";
import {
    useAddTokenMutation,
    useUpdateTokenStateMutation,
    useTokenBalancesQuery,
    useTokenMetadataQuery,
    useTokenPricesQuery,
    useTokenListQuery,
    useSyncTokenList,
    useMultipleTokenMutation,
} from "./token-hooks";
import {
    ICExplorerService,
    IcExplorerTokenDetail,
    mapTokenListItemToAddTokenItem,
} from "@/services/icExplorer.service";
import {
    AddTokenInput,
    AddTokenItem,
    AddTokensInput,
} from "../../../declarations/token_storage/token_storage.did";

// Main hook that components should use
export function useTokens() {
    const identity = useIdentity();

    // Get Zustand store actions
    const {
        setRawTokenList,
        setIsLoading,
        setIsLoadingBalances,
        setIsLoadingPrices,
        setIsSyncPreferences,
        setIsImporting,
        setFilters,
    } = useTokenStore();

    const tokenListQuery = useTokenListQuery();
    // Use React Query hooks
    const tokenMetadataQuery = useTokenMetadataQuery(tokenListQuery.data?.tokens);
    const tokenBalancesQuery = useTokenBalancesQuery(tokenListQuery.data?.tokens);
    const tokenPricesQuery = useTokenPricesQuery();

    // Mutations
    const syncTokenListMutation = useSyncTokenList(identity);
    const addTokenMutation = useAddTokenMutation(identity);
    const addMultipleTokenMutation = useMultipleTokenMutation(identity);
    const updateTokenState = useUpdateTokenStateMutation(identity);

    // Implement operation functions
    const addToken = async (input: AddTokenInput) => {
        setIsImporting(true);
        await addTokenMutation.mutateAsync(input);
        await tokenListQuery.refetch();
        setIsImporting(false);
    };

    // Toggle a single token's visibility in preferences
    const toggleTokenVisibility = async (tokenId: string, enable: boolean) => {
        setIsSyncPreferences(true);
        await updateTokenState.mutateAsync({ tokenId, enable });
        await tokenListQuery.refetch();
        setIsSyncPreferences(false);
    };

    const updateTokenInit = async () => {
        await tokenListQuery.refetch();
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

        // Implement retry function with exponential backoff
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

                    // Wait for delay time
                    await new Promise((resolve) => setTimeout(resolve, delay));

                    // Retry with incremented counter
                    return getTokenListWithRetry(retries + 1);
                } else {
                    console.error("Failed to get token list after ${MAX_RETRIES} attempts:", error);
                    // Return empty array if all retries fail
                    return [];
                }
            }
        };

        // Get token list with retry mechanism
        const tokenList = await getTokenListWithRetry();

        if (tokenList.length > 0) {
            // Format tokens as required by the AddTokensInput interface: Array<[string, [] | [RegisterTokenInput]]>
            const tokenTuples = tokenList.map((token) => {
                const tokenId = `IC:${token.ledgerId}`; // Create token ID using proper format
                const tokenData = mapTokenListItemToAddTokenItem(token); // Convert to TokenListItem
                return [tokenId, [tokenData]];
            }) as Array<[string, [] | [AddTokenItem]]>;

            // Create the proper AddTokensInput object
            const tokensToAdd: AddTokensInput = {
                tokens_disable: tokenTuples,
                tokens_enable: [],
            };

            console.log("tokensToAdd", tokensToAdd);

            try {
                await addMultipleTokenMutation.mutateAsync(tokensToAdd);
            } catch (error) {
                console.error("Error adding tokens:", error);
            } finally {
                tokenListQuery.refetch();
            }
        }
    };

    const updateTokenBalance = async () => {
        await tokenBalancesQuery.refetch();
    };

    // Combined enrichment effect that handles all data stages
    useEffect(() => {
        // Do nothing if we don't have the base token list
        if (!tokenListQuery.data) return;

        // Start with raw token list from backend - make a fresh copy to avoid mutation issues
        let currentTokens = [...tokenListQuery.data.tokens];

        // 1. Enrich with balances if available
        if (tokenBalancesQuery.data) {
            // Convert tokenBalancesQuery.data array to a map for more efficient lookups
            const balanceMap: Record<string, bigint | undefined> = {};
            tokenBalancesQuery.data.forEach((balance) => {
                if (balance.address && balance.amount !== undefined) {
                    balanceMap[balance.address] = balance.amount;
                }
            });

            currentTokens = currentTokens.map((token) => {
                // Look up balance directly from the map (O(1) operation)
                const amount = balanceMap[token.address];

                // If balance data exists, enrich the token
                if (amount !== undefined) {
                    return {
                        ...token,
                        amount,
                    };
                }
                // Otherwise, return the token as is
                return token;
            });
        }

        // 2. Enrich with metadata if available
        if (tokenMetadataQuery.data) {
            console.log(
                `Enriching tokens with metadata for ${Object.keys(tokenMetadataQuery.data).length} tokens`,
            );

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

        // Update the state with all enrichments in one go - this is now our single source of truth
        // The state update here is batched and will cause a single re-render with the complete data
        setRawTokenList(currentTokens);
    }, [
        tokenListQuery.data,
        tokenBalancesQuery.data,
        tokenMetadataQuery.data,
        tokenPricesQuery.data,
    ]);

    // Separate useEffect for token balances loading state
    useEffect(() => {
        const isLoading = tokenBalancesQuery.isLoading || tokenBalancesQuery.isFetching;
        setIsLoadingBalances(isLoading);

        // If loading completes, update the enriched token list
        if (!isLoading && tokenBalancesQuery.data && tokenListQuery.data?.tokens) {
            // This triggers a re-run of the main useEffect that enriches tokens
        }
    }, [tokenBalancesQuery.isLoading, tokenBalancesQuery.isFetching, tokenBalancesQuery.data]);

    // Separate useEffect for token prices loading state
    useEffect(() => {
        const isLoading = tokenPricesQuery.isLoading || tokenPricesQuery.isFetching;
        setIsLoadingPrices(isLoading);

        // If loading completes, update the enriched token list
        if (!isLoading && tokenPricesQuery.data && tokenListQuery.data?.tokens) {
            // This triggers a re-run of the main useEffect that enriches tokens
        }
    }, [tokenPricesQuery.isLoading, tokenPricesQuery.isFetching, tokenPricesQuery.data]);

    useEffect(() => {
        // onloading when first load
        if (tokenListQuery.isFetching && !tokenListQuery.data) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }

        // Check if we need to sync with backend version
        if (tokenListQuery.data?.needUpdateVersion) {
            syncTokenListMutation.mutateAsync();
        }

        // Update filter preferences if they exist
        if (tokenListQuery.data?.perference) {
            setFilters(tokenListQuery.data.perference);
        }

        // We'll handle setting rawTokenList in the main enrichment useEffect
        // to avoid race conditions between this effect and the enrichment effect
    }, [tokenListQuery.data, tokenListQuery.isFetching]);

    // Update operation functions in Zustand
    useEffect(() => {
        useTokenStore.setState({
            addToken,
            toggleTokenVisibility,
            updateTokenInit,
            updateTokenExplorer,
            updateTokenBalance,
        });
    }, []);

    // Return the store with all data and operations
    return useTokenStore();
}
