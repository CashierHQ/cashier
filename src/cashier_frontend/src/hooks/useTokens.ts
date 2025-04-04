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
        setError,
        setHasBalances,
        setFilters,
        filters,
        applyFilters,
    } = useTokenStore();

    // Use React Query hooks
    const tokenListQuery = useTokenListQuery(identity);
    const tokenBalancesQuery = useTokenBalancesQuery(tokenListQuery.data, identity);
    const userPreferencesQuery = useUserPreferencesQuery(identity);

    // Mutations
    const addTokenMutation = useAddTokenMutation(identity);
    // const removeTokenMutation = useRemoveTokenMutation(identity);
    const updateBalanceMutation = useUpdateBalanceMutation(identity);
    const toggleTokenVisibilityMutation = useToggleTokenVisibilityMutation(identity);
    const batchToggleTokenVisibilityMutation = useBatchToggleTokenVisibilityMutation(identity);
    const updateUserFiltersMutation = useUpdateUserFiltersMutation(identity);

    // Sync React Query to Zustand
    useEffect(() => {
        // Update loading state
        setIsLoading(tokenListQuery.isLoading);

        // Update error state (prefer balance error if it exists)
        setError((tokenBalancesQuery.error || tokenListQuery.error) as Error | null);

        // Update tokens - use tokens with balances if available
        if (tokenBalancesQuery.data && tokenBalancesQuery.data.length > 0) {
            setTokens(tokenBalancesQuery.data);
            setHasBalances(true);
        } else if (tokenListQuery.data) {
            setTokens(tokenListQuery.data);
        }

        // Update preference filters if available
        if (userPreferencesQuery.data) {
            setFilters(userPreferencesQuery.data);
        }

        // Update balance loading state
        setIsLoadingBalances(tokenBalancesQuery.isLoading || tokenBalancesQuery.isFetching);
    }, [
        tokenListQuery.data,
        tokenListQuery.isLoading,
        tokenListQuery.error,
        tokenBalancesQuery.data,
        tokenBalancesQuery.isLoading,
        tokenBalancesQuery.isFetching,
        tokenBalancesQuery.error,
        userPreferencesQuery.data,
    ]);

    // Implement operation functions
    const addToken = async (input: AddTokenInput) => {
        await addTokenMutation.mutateAsync(input);
        await tokenListQuery.refetch();
        await tokenBalancesQuery.refetch();
    };

    const removeToken = async (tokenId: string) => {
        // await removeTokenMutation.mutateAsync(tokenId);
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
        console.log("Toggling token visibility:", tokenId, hidden);
        await toggleTokenVisibilityMutation.mutateAsync({ tokenId, hidden });
        await userPreferencesQuery.refetch();
        await tokenListQuery.refetch();
        await tokenBalancesQuery.refetch();
    };

    // Toggle multiple tokens' visibility for better performance
    const batchToggleTokenVisibility = async (toggles: Array<[string, boolean]>) => {
        await batchToggleTokenVisibilityMutation.mutateAsync(toggles);
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

    const refreshTokens = async () => {
        await tokenListQuery.refetch();
    };

    const refreshBalances = async () => {
        await tokenBalancesQuery.refetch();
    };

    const updateTokenInit = async () => {
        await tokenListQuery.refetch();
        await userPreferencesQuery.refetch();
        applyFilters();
        await tokenBalancesQuery.refetch();
    };

    const updateToken = async () => {
        await tokenListQuery.refetch();
        await userPreferencesQuery.refetch();
        applyFilters();
        await tokenBalancesQuery.refetch();
    };

    const updateTokenExplorer = async () => {
        await tokenListQuery.refetch();
    };

    const updateTokenBalance = async () => {
        await tokenListQuery.refetch();
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
