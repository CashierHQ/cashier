import { useEffect } from "react";
import { useIdentity } from "@nfid/identitykit/react";
import { useTokenStore } from "@/stores/tokenStore";
import {
    useAddTokenMutation,
    useToggleTokenEnabledMutation,
    useTokenBalancesQuery,
    useTokenListQuery,
    useUpdateBalanceMutation,
} from "./token-hooks";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";
import { FungibleToken } from "@/types/fungible-token.speculative";

// Main hook that components should use
export function useTokens() {
    const identity = useIdentity();

    // Get Zustand store actions
    const { setTokens, setIsLoading, setIsLoadingBalances, setError, setHasBalances } =
        useTokenStore();

    // Use React Query hooks
    const tokenListQuery = useTokenListQuery(identity);
    const tokenBalancesQuery = useTokenBalancesQuery(tokenListQuery.data, identity);
    const addTokenMutation = useAddTokenMutation(identity);
    const toggleTokenEnabledMutation = useToggleTokenEnabledMutation(identity);
    const updateBalanceMutation = useUpdateBalanceMutation(identity);

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
    ]);

    // Implement operation functions
    const addToken = async (input: AddTokenInput) => {
        await addTokenMutation.mutateAsync(input);
        await tokenListQuery.refetch();
        await tokenBalancesQuery.refetch();
    };

    // Add a new method to manually update balances in the backend
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
    };

    const toggleTokenEnabled = async (tokenId: string, enabled: boolean) => {
        await toggleTokenEnabledMutation.mutateAsync({ tokenId, enabled });
    };

    const refreshTokens = async () => {
        await tokenListQuery.refetch();
    };

    const refreshBalances = async () => {
        await tokenBalancesQuery.refetch();
    };

    useEffect(() => {
        // Update tokens - use tokens with balances if available
        if (tokenListQuery.data) {
            setTokens(tokenListQuery.data);
        }
        // Log for debugging
    }, [
        tokenListQuery.data,
        // other dependencies
    ]);

    // Update operation functions in Zustand
    useEffect(() => {
        useTokenStore.setState({
            addToken,
            toggleTokenEnabled,
            refreshTokens,
            refreshBalances,
            cacheBalances,
        });
    }, []);

    // Just return the store - all data and operations are in there
    return useTokenStore();
}
