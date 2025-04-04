import { useEffect } from "react";
import { useIdentity } from "@nfid/identitykit/react";
import { useTokenStore } from "@/stores/tokenStore";
import {
    useAddTokenMutation,
    useTokenBalancesQuery,
    useTokenListQuery,
    useToggleTokenVisibilityMutation,
    useUpdateBalanceMutation,
    useUserPreferencesQuery,
    useBatchToggleTokenVisibilityMutation,
    useUpdateUserFiltersMutation,
    useTokenMetadataQuery,
    useTokenPricesQuery, // Import the new price hook
} from "./token-hooks";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { TokenFilters } from "@/types/token-store.type";

// Main hook that components should use
export function useTokens() {
    const identity = useIdentity();

    // Get Zustand store actions
    const {
        setTokens,
        setIsLoading,
        setIsLoadingBalances,
        setIsSyncPreferences,
        setIsImporting,
        setError,
        setHasBalances,
        setFilters,
        filters,
        applyFilters,
    } = useTokenStore();

    // Use React Query hooks
    const tokenListQuery = useTokenListQuery(identity);
    const tokenMetadataQuery = useTokenMetadataQuery(tokenListQuery.data, identity);
    const tokenBalancesQuery = useTokenBalancesQuery(tokenListQuery.data, identity);
    const userPreferencesQuery = useUserPreferencesQuery(identity);
    const tokenPricesQuery = useTokenPricesQuery(); // Add the prices query

    // Mutations
    const addTokenMutation = useAddTokenMutation(identity);
    const updateBalanceMutation = useUpdateBalanceMutation(identity);
    const toggleTokenVisibilityMutation = useToggleTokenVisibilityMutation(identity);
    const batchToggleTokenVisibilityMutation = useBatchToggleTokenVisibilityMutation(identity);
    const updateUserFiltersMutation = useUpdateUserFiltersMutation(identity);

    // Sync React Query to Zustand
    useEffect(() => {
        // Update loading state
        setIsLoading(tokenListQuery.isLoading || tokenPricesQuery.isLoading);

        // Update error state
        setError(
            (tokenBalancesQuery.error ||
                tokenListQuery.error ||
                tokenPricesQuery.error) as Error | null,
        );

        // Process tokens with combined balance and price data
        if (tokenBalancesQuery.data && tokenBalancesQuery.data.length > 0) {
            const tokensWithBalances = tokenBalancesQuery.data;
            const prices = tokenPricesQuery.data || {};

            // Always enrich with prices (which might be empty if not loaded yet)
            const enrichedTokens = tokensWithBalances.map((token) => {
                const price = prices[token.address] || null;

                return {
                    ...token,
                    usdConversionRate: price,
                    usdEquivalent:
                        price && token.amount
                            ? (Number(token.amount) * price) / Math.pow(10, token.decimals)
                            : null,
                };
            });

            setTokens(enrichedTokens);
            setHasBalances(true);
        } else if (tokenListQuery.data) {
            // Get basic token list if balances aren't available
            const tokenList = tokenListQuery.data;
            const prices = tokenPricesQuery.data || {};

            // Always enrich with prices (which might be empty if not loaded yet)
            const enrichedTokens = tokenList.map((token) => {
                const price = prices[token.address] || null;

                return {
                    ...token,
                    usdConversionRate: price,
                    usdEquivalent:
                        price && token.amount
                            ? (Number(token.amount) * price) / Math.pow(10, token.decimals)
                            : null,
                };
            });

            setTokens(enrichedTokens);
        }

        // Update preference filters if available
        if (userPreferencesQuery.data) {
            setFilters(userPreferencesQuery.data);
        }

        // Update balance loading state
        setIsLoadingBalances(
            tokenBalancesQuery.isLoading ||
                tokenBalancesQuery.isFetching ||
                tokenPricesQuery.isLoading ||
                tokenPricesQuery.isFetching,
        );
    }, [
        // Dependencies remain the same
        tokenListQuery.data,
        tokenListQuery.isLoading,
        tokenListQuery.error,
        tokenBalancesQuery.data,
        tokenBalancesQuery.isLoading,
        tokenBalancesQuery.isFetching,
        tokenBalancesQuery.error,
        tokenPricesQuery.data,
        tokenPricesQuery.isLoading,
        tokenPricesQuery.isFetching,
        tokenPricesQuery.error,
        userPreferencesQuery.data,
    ]);

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

    // Cache token balances in the backend
    const cacheBalances = async (tokens: FungibleToken[]) => {
        if (!tokens || tokens.length === 0) return;

        const balancesToCache = tokens
            .filter((token) => token.amount !== undefined)
            .map((token) => ({
                tokenId: token.address,
                balance: token.amount,
            }));

        if (balancesToCache.length > 0) {
            await updateBalanceMutation.mutateAsync(balancesToCache);
        }
        await tokenBalancesQuery.refetch();
    };

    // Toggle a single token's visibility in preferences
    const toggleTokenVisibility = async (tokenId: string, hidden: boolean) => {
        setIsSyncPreferences(true);
        await toggleTokenVisibilityMutation.mutateAsync({ tokenId, hidden });
        await tokenListQuery.refetch();
        setIsSyncPreferences(false);
        await userPreferencesQuery.refetch();
        await tokenBalancesQuery.refetch();
    };

    // Toggle multiple tokens' visibility for better performance
    const batchToggleTokenVisibility = async (toggles: Array<[string, boolean]>) => {
        await batchToggleTokenVisibilityMutation.mutateAsync(toggles);
        await userPreferencesQuery.refetch();
        await tokenListQuery.refetch();
        await userPreferencesQuery.refetch();
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

    // Create a combined refresh function
    const refreshTokenData = async () => {
        setIsLoadingBalances(true);

        try {
            // Parallel fetch of balances and prices for maximum efficiency
            const [balancesResult, pricesResult] = await Promise.all([
                tokenBalancesQuery.refetch(),
                tokenPricesQuery.refetch(),
            ]);

            // If we have both data sets, combine them
            if (balancesResult.data && pricesResult.data) {
                const tokens = balancesResult.data;
                const prices = pricesResult.data;

                // Create enriched tokens with both balance and price data
                const enrichedTokens = tokens.map((token) => {
                    const price = prices[token.address] || null;

                    return {
                        ...token,
                        usdConversionRate: price,
                        usdEquivalent:
                            price && token.amount
                                ? (Number(token.amount) * price) / Math.pow(10, token.decimals)
                                : null,
                    };
                });

                // Update the store with combined data
                setTokens(enrichedTokens);
                setHasBalances(tokens.some((token) => token.amount && Number(token.amount) > 0));
            }
        } catch (error) {
            setError(error as Error);
        } finally {
            setIsLoadingBalances(false);
        }
    };

    const refreshTokens = async () => {
        updateToken();
    };

    const refreshBalances = async () => {
        updateToken();
    };

    const refreshPrices = async () => {
        updateToken();
    };

    const updateTokenInit = async () => {
        console.log("Updating token init");
        await tokenListQuery.refetch();
        await userPreferencesQuery.refetch();
        applyFilters();
        await tokenMetadataQuery.refetch();
        await tokenBalancesQuery.refetch();
        await tokenPricesQuery.refetch(); // Also refresh prices
    };

    const updateToken = async () => {
        await tokenListQuery.refetch();
        await userPreferencesQuery.refetch();
        applyFilters();
        await tokenBalancesQuery.refetch();
        await tokenPricesQuery.refetch(); // Also refresh prices
    };

    const updateTokenExplorer = async () => {
        await tokenListQuery.refetch();
    };

    const updateTokenBalance = async () => {
        await tokenBalancesQuery.refetch();
    };

    // Update operation functions in Zustand
    useEffect(() => {
        useTokenStore.setState({
            addToken,
            removeToken,
            toggleTokenVisibility,
            batchToggleTokenVisibility,
            updateUserFilters,
            refreshTokens,
            refreshBalances,
            refreshPrices, // Add the new function
            cacheBalances,
            updateTokenInit,
            updateToken,
            updateTokenExplorer,
            updateTokenBalance,
        });
    }, [identity]);

    // Return the store with all data and operations
    return useTokenStore();
}
