import { useEffect } from "react";
import { useIdentity } from "@nfid/identitykit/react";
import { useTokenStore } from "@/stores/tokenStore";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";
import { TokenFilters } from "@/types/token-store.type";
import {
    useAddTokenMutation,
    useAddTokensMutation,
    useToggleTokenVisibilityMutation,
    useTokenBalancesQuery,
    useTokenListQuery,
    useTokenMetadataQuery,
    useTokenPricesQuery,
    useUpdateUserFiltersMutation,
    useUserPreferencesQuery,
} from "./token-hooks";
import {
    FungibleToken,
    mapTokenModelToFungibleToken,
    TokenModel,
} from "@/types/fungible-token.speculative";
import {
    ICExplorerService,
    mapDataSourceTokenToAddTokenInput,
} from "@/services/icExplorer.service";

// Main hook that components should use
export function useTokens() {
    const identity = useIdentity();

    // Get Zustand store actions
    const {
        rawTokenList,
        setRawTokenList,
        setFilters,
        setIsLoading,
        setIsLoadingBalances,
        setIsLoadingPrices,
        setIsSyncPreferences,
        setIsImporting,
        filters,
        applyFilters,
    } = useTokenStore();

    // Use React Query hooks
    const tokenListQuery = useTokenListQuery(identity);
    const userPreferencesQuery = useUserPreferencesQuery(identity);
    const tokenMetadataQuery = useTokenMetadataQuery(tokenListQuery.data);
    const tokenBalancesQuery = useTokenBalancesQuery(tokenListQuery.data);
    const tokenPricesQuery = useTokenPricesQuery(); // Add the prices query

    // Mutations
    const addTokenMutation = useAddTokenMutation(identity);
    const addMultpleTokensMutation = useAddTokensMutation(identity);
    const toggleTokenVisibilityMutation = useToggleTokenVisibilityMutation(identity);
    const updateUserFiltersMutation = useUpdateUserFiltersMutation(identity);

    // Implement operation functions
    const addToken = async (input: AddTokenInput) => {
        setIsImporting(true);
        await addTokenMutation.mutateAsync(input);
        setIsImporting(false);

        await updateToken();
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const removeToken = async (tokenId: string) => {
        await tokenListQuery.refetch();
    };

    // Toggle a single token's visibility in preferences
    const toggleTokenVisibility = async (tokenId: string, hidden: boolean) => {
        setIsSyncPreferences(true);
        await toggleTokenVisibilityMutation.mutateAsync({ tokenId, hidden });
        await tokenListQuery.refetch();
        setIsSyncPreferences(false);
    };

    // Update user filter preferences
    const updateUserFilters = async (filterUpdates: Partial<TokenFilters>) => {
        // Merge with current filters to ensure we have complete data
        const updatedFilters = {
            ...filters,
            ...filterUpdates,
        };

        await updateUserFiltersMutation.mutateAsync(updatedFilters);
        await userPreferencesQuery.refetch();
    };

    const updateTokenInit = async () => {
        console.log("Updating token init");
        await tokenListQuery.refetch();
        await userPreferencesQuery.refetch();
    };

    const updateToken = async () => {
        console.log("call updateToken");
        await tokenListQuery.refetch();
        await userPreferencesQuery.refetch();
        await tokenBalancesQuery.refetch();
    };

    const updateTokenExplorer = async () => {
        const explorerService = new ICExplorerService();
        if (!identity) {
            console.error("No identity found");
            return;
        }
        const tokenList = await explorerService.getUserTokens(identity.getPrincipal().toText());

        if (tokenList.length > 0) {
            const tokensToAdd: AddTokenInput[] = tokenList.map((token) =>
                mapDataSourceTokenToAddTokenInput(token),
            );

            await addMultpleTokensMutation.mutateAsync(tokensToAdd);
        }

        await tokenListQuery.refetch();
        await tokenBalancesQuery.refetch();
    };

    const updateTokenBalance = async () => {
        console.log("call updateTokenBalance");
        await tokenBalancesQuery.refetch();
    };

    // Enrich tokens with balances, metadata, and prices
    useEffect(() => {
        // Only process data when tokenList is available
        if (!tokenListQuery.data) return;

        // Always use the most recent token list data from the query
        // This prevents conflicts when the rawTokenList might be outdated
        const rawTokens: FungibleToken[] = tokenListQuery.data.map((token: TokenModel) => {
            return mapTokenModelToFungibleToken(token);
        });

        // Create an enriched token list by merging all data sources
        const enrichedTokens = rawTokens.map((token) => {
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
            }

            // 2. Enrich with metadata
            if (tokenMetadataQuery.data) {
                const metadataMap = tokenMetadataQuery.data;
                const metadata = metadataMap[token.address];
                if (metadata?.fee !== undefined) {
                    enrichedToken.fee = metadata.fee;
                    enrichedToken.logoFallback = metadata.logo;
                }
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
            }

            return enrichedToken;
        });

        // Update the token store with enriched tokens
        setRawTokenList(enrichedTokens);

        if (userPreferencesQuery.data) {
            setFilters(userPreferencesQuery.data);
        }
    }, [
        identity,
        tokenListQuery.data,
        tokenBalancesQuery.data,
        tokenMetadataQuery.data,
        tokenPricesQuery.data,
    ]);

    // Separate useEffect for token list loading state
    useEffect(() => {
        setIsLoading(tokenListQuery.isLoading || userPreferencesQuery.isLoading);
    }, [tokenListQuery.isLoading, userPreferencesQuery.isLoading]);

    // Separate useEffect for token balances loading state
    useEffect(() => {
        setIsLoadingBalances(tokenBalancesQuery.isLoading || tokenBalancesQuery.isFetching);
    }, [tokenBalancesQuery.isLoading, tokenBalancesQuery.isFetching]);

    // Separate useEffect for token prices loading state
    useEffect(() => {
        setIsLoadingPrices(tokenPricesQuery.isLoading || tokenPricesQuery.isFetching);
    }, [tokenPricesQuery.isLoading, tokenPricesQuery.isFetching]);

    // Update operation functions in Zustand
    useEffect(() => {
        useTokenStore.setState({
            addToken,
            removeToken,
            toggleTokenVisibility,
            updateUserFilters,
            updateTokenInit,
            updateToken,
            updateTokenExplorer,
            updateTokenBalance,
        });
    }, []);

    // Return the store with all data and operations
    return useTokenStore();
}
