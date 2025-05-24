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
    FungibleToken,
    mapTokenModelToFungibleToken,
    TokenModel,
} from "@/types/fungible-token.speculative";
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
                    console.error(`Failed to get token list after ${MAX_RETRIES} attempts:`, error);
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

    // Create a refetch function to manually trigger token data refresh
    const refetchAllTokenData = async () => {
        await tokenListQuery.refetch();
        if (tokenListQuery.data?.tokens) {
            await Promise.all([
                tokenBalancesQuery.refetch(),
                tokenMetadataQuery.refetch(),
                tokenPricesQuery.refetch(),
            ]);
        }
    };

    // Process user tokens list (if authenticated)
    useEffect(() => {
        if (!identity || !tokenListQuery.data) return;

        const userTokens: FungibleToken[] = tokenListQuery.data.tokens.map((token: TokenModel) => {
            return mapTokenModelToFungibleToken(token);
        });

        // Create an enriched token list by merging all data sources
        const enrichedUserTokens = userTokens.map((token) => {
            // Basic token model
            const enrichedToken = { ...token };

            // 1. Enrich with balance data
            if (tokenBalancesQuery.data) {
                const balanceData = tokenBalancesQuery.data.find(
                    (t) => t.address === token.address,
                );
                if (balanceData?.amount !== undefined) {
                    enrichedToken.amount = balanceData.amount;
                }
            } else if (token.amount) {
                // Use the amount from tokenListQuery if balance query is still loading
                enrichedToken.amount = token.amount;
            }

            // 2. Enrich with metadata
            if (tokenMetadataQuery.data) {
                const metadataMap = tokenMetadataQuery.data;
                const metadata = metadataMap[token.address];
                if (metadata?.fee !== undefined) {
                    enrichedToken.fee = metadata.fee;
                    enrichedToken.logoFallback = metadata.logo;
                }
            } else if (token.fee !== undefined) {
                // Use fee from tokenListQuery if metadata query is still loading
                enrichedToken.fee = token.fee;
            }

            // 3. Enrich with price data
            if (tokenPricesQuery.data) {
                const priceMap = tokenPricesQuery.data;
                const price = priceMap[token.address];

                if (price) {
                    enrichedToken.usdConversionRate = price;
                    if (enrichedToken.amount) {
                        const amountInNumber =
                            Number(enrichedToken.amount) / Math.pow(10, enrichedToken.decimals);
                        enrichedToken.usdEquivalent = price * amountInNumber;
                    } else {
                        enrichedToken.usdEquivalent = 0;
                    }
                }
            } else if (token.usdConversionRate !== undefined) {
                // Use price data from tokenListQuery if prices query is still loading
                enrichedToken.usdConversionRate = token.usdConversionRate;
                enrichedToken.usdEquivalent = token.usdEquivalent;
            }

            return enrichedToken;
        });

        // Update user token list
        setRawTokenList(enrichedUserTokens);
    }, [
        identity,
        tokenListQuery.data,
        tokenBalancesQuery.data,
        tokenMetadataQuery.data,
        tokenPricesQuery.data,
        // Also update when loading states change
        tokenBalancesQuery.isLoading,
        tokenMetadataQuery.isLoading,
        tokenPricesQuery.isLoading,
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

        // Only update raw tokens list directly if needed
        if (tokenListQuery.data?.tokens) {
            console.log(`Received ${tokenListQuery.data.tokens.length} tokens from backend`);
            setRawTokenList(tokenListQuery.data.tokens);
        }

        // Check if we need to sync with backend version
        if (tokenListQuery.data?.needUpdateVersion) {
            console.log("Token list needs version update, syncing with backend...");
            syncTokenListMutation.mutateAsync();
        }

        // Update filter preferences if they exist
        if (tokenListQuery.data?.perference) {
            console.log("Applying token preferences from backend:", tokenListQuery.data.perference);
            setFilters(tokenListQuery.data.perference);
        }
    }, [tokenListQuery.data, tokenListQuery.isFetching]);

    // useEffect(() => {
    //     tokenListQuery.refetch();
    // }, [identity])

    // Update operation functions in Zustand
    useEffect(() => {
        useTokenStore.setState({
            addToken,
            toggleTokenVisibility,
            updateTokenInit,
            updateTokenExplorer,
            updateTokenBalance,
            // Add the new refetch function
            refetchData: refetchAllTokenData,
        });
    }, []);

    // Return the store with all data and operations
    return useTokenStore();
}
