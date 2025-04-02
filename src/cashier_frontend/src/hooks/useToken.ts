import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Identity } from "@dfinity/agent";
import { useTokenStore } from "@/stores/tokenStore";
import TokenService from "@/services/token.service";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";
import { mapUserTokenToFungibleToken } from "@/types/token-store.type";

// Keys for React Query
const TOKEN_QUERY_KEYS = {
    TOKENS: "tokens",
    TOKEN_BALANCES: "token-balances",
};

/**
 * Unified token hook that handles fetching tokens, balances, and provides operations
 */
export function useTokens(
    identity: Identity | undefined,
    options = {
        refetchInterval: 30000,
        enabled: true,
    },
) {
    const queryClient = useQueryClient();
    const {
        _setRawDefaultTokenList,
        _setRawTokenList,
        _setFilteredTokenList,
        _setRawTokenFilters,
        _setLoading,
        _setBalanceLoading,
        _setError,
        filteredTokenList,
        rawDefaultTokenList,
        searchTokens: searchTokensFunction,
    } = useTokenStore();

    // Primary query to fetch tokens and user preferences
    const tokensQuery = useQuery({
        queryKey: [TOKEN_QUERY_KEYS.TOKENS],
        queryFn: async () => {
            if (!identity) throw new Error("Not authenticated");
            _setLoading(true);

            try {
                const tokenService = new TokenService(identity);
                const result = await tokenService.fetchTokensAndPreferences();

                // Update Zustand store
                _setRawDefaultTokenList(result.defaultTokens);
                _setRawTokenList(result.tokens);
                _setFilteredTokenList(result.filteredTokens);
                _setRawTokenFilters(result.filters);

                return result;
            } catch (error) {
                console.error("Failed to initialize token list:", error);
                _setError(error instanceof Error ? error : new Error(String(error)));
                throw error;
            } finally {
                _setLoading(false);
            }
        },
        enabled: !!identity && options.enabled,
    });

    // Get display tokens from Zustand or from default tokens if none available
    const displayTokens =
        filteredTokenList.length > 0
            ? filteredTokenList
            : rawDefaultTokenList.map((token) => mapUserTokenToFungibleToken(token));

    // Secondary query to fetch and update balances periodically
    const balancesQuery = useQuery({
        queryKey: [TOKEN_QUERY_KEYS.TOKEN_BALANCES],
        queryFn: async () => {
            if (!identity || displayTokens.length === 0) return displayTokens;

            _setBalanceLoading(true);

            try {
                const tokenService = new TokenService(identity);
                const updatedTokens = await tokenService.updateAllBalances(displayTokens);
                _setFilteredTokenList(updatedTokens);
                return updatedTokens;
            } catch (error) {
                console.error("Failed to update token balances:", error);
                _setError(error instanceof Error ? error : new Error(String(error)));
                return displayTokens; // Return existing tokens on error to prevent UI issues
            } finally {
                _setBalanceLoading(false);
            }
        },
        enabled: !!identity && displayTokens.length > 0 && options.enabled,
        refetchInterval: options.refetchInterval,
    });

    // Mutation to add a token
    const addToken = useMutation({
        mutationFn: async (input: AddTokenInput) => {
            if (!identity) throw new Error("Not authenticated");
            _setLoading(true);

            try {
                const tokenService = new TokenService(identity);
                await tokenService.addToken(input);
                return true;
            } catch (error) {
                console.error("Failed to add token:", error);
                _setError(error instanceof Error ? error : new Error(String(error)));
                throw error;
            } finally {
                _setLoading(false);
            }
        },
        onSuccess: () => {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: [TOKEN_QUERY_KEYS.TOKENS] });
            queryClient.invalidateQueries({ queryKey: [TOKEN_QUERY_KEYS.TOKEN_BALANCES] });
        },
    });

    // Mutation to toggle token enabled status
    const toggleTokenEnabled = useMutation({
        mutationFn: async ({ tokenId, enabled }: { tokenId: string; enabled: boolean }) => {
            if (!identity) throw new Error("Not authenticated");
            _setLoading(true);

            try {
                const tokenService = new TokenService(identity);
                await tokenService.toggleTokenEnabled(tokenId, enabled);
                return true;
            } catch (error) {
                console.error("Failed to toggle token enabled status:", error);
                _setError(error instanceof Error ? error : new Error(String(error)));
                throw error;
            } finally {
                _setLoading(false);
            }
        },
        onSuccess: () => {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: [TOKEN_QUERY_KEYS.TOKENS] });
            queryClient.invalidateQueries({ queryKey: [TOKEN_QUERY_KEYS.TOKEN_BALANCES] });
        },
    });

    // Mutation to update a single token balance
    const updateSingleTokenBalance = useMutation({
        mutationFn: async (tokenAddress: string) => {
            if (!identity) return undefined;

            _setLoading(true);

            try {
                const tokenService = new TokenService(identity);
                const updatedToken = await tokenService.updateSingleTokenBalance(
                    tokenAddress,
                    displayTokens,
                );

                if (updatedToken) {
                    // Update the token in the filtered list
                    const updatedTokens = displayTokens.map((token) =>
                        token.address === tokenAddress ? updatedToken : token,
                    );

                    _setFilteredTokenList(updatedTokens);
                }

                return updatedToken;
            } catch (error) {
                console.error(`Failed to update token balance for ${tokenAddress}:`, error);
                _setError(error instanceof Error ? error : new Error(String(error)));
                throw error;
            } finally {
                _setLoading(false);
            }
        },
        onSuccess: (updatedToken) => {
            if (updatedToken) {
                // Also update the entire list cache
                queryClient.invalidateQueries({ queryKey: [TOKEN_QUERY_KEYS.TOKEN_BALANCES] });
            }
        },
    });

    // Helper function to search tokens
    const searchTokens = (query: string) => {
        return searchTokensFunction(query, displayTokens);
    };

    // Calculate loading state
    const isLoading = tokensQuery.isLoading || (balancesQuery.isLoading && !balancesQuery.data);

    // Calculate if we're just refreshing balances
    const isRefreshing = balancesQuery.isRefetching;

    // Return everything the consumer might need
    return {
        // Data
        tokens: balancesQuery.data || displayTokens,

        // Loading states
        isLoading,
        isRefreshing,
        error: tokensQuery.error || balancesQuery.error,

        // Operations
        refreshBalances: balancesQuery.refetch,
        addToken: (input: AddTokenInput) => addToken.mutate(input),
        toggleTokenEnabled: (tokenId: string, enabled: boolean) =>
            toggleTokenEnabled.mutate({ tokenId, enabled }),
        updateSingleTokenBalance: (tokenAddress: string) =>
            updateSingleTokenBalance.mutate(tokenAddress),
        searchTokens,

        // Operation states
        isAddingToken: addToken.isPending,
        isTogglingToken: toggleTokenEnabled.isPending,
        isUpdatingSingleToken: updateSingleTokenBalance.isPending,
        updatingSingleTokenAddress: updateSingleTokenBalance.variables,
    };
}
