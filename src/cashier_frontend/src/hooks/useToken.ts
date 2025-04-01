import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import TokenService from "@/services/token.service";
import {
    AddTokenInput,
    RemoveTokenInput,
} from "../../../declarations/token_storage/token_storage.did";
import { useMemo } from "react";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { getDisplayTokens, useTokenStore } from "@/stores/tokenStore";
import {
    mapFiltersToUserPreferenceInput,
    mapUserPreferenceToFilters,
    mapUserTokenToFungibleToken,
} from "@/types/token-store.type";

// Hook to fetch and manage tokens
export function useTokens() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const {
        rawTokenList,
        rawTokenFilters,
        displayTokens,
        setRawTokenList,
        setTokensError,
        setIsLoadingTokens,
    } = useTokenStore();

    // Query to fetch tokens
    const { isLoading, error, refetch } = useQuery({
        queryKey: ["tokens", identity?.toString()],
        queryFn: async () => {
            setIsLoadingTokens(true);
            try {
                const tokenService = new TokenService(identity);
                const tokens = await tokenService.listTokens();
                setRawTokenList(tokens);
                return tokens;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setTokensError(error);
                throw error;
            } finally {
                setIsLoadingTokens(false);
            }
        },
        enabled: !!identity,
        refetchOnWindowFocus: false,
    });

    // Mutation to add a token
    const addTokenMutation = useMutation({
        mutationFn: async (input: AddTokenInput) => {
            const tokenService = new TokenService(identity);
            await tokenService.addToken(input);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tokens", identity?.toString()] });
        },
    });

    // Mutation to remove a token
    const removeTokenMutation = useMutation({
        mutationFn: async (input: RemoveTokenInput) => {
            const tokenService = new TokenService(identity);
            await tokenService.removeToken(input);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tokens", identity?.toString()] });
        },
    });

    // Get filtered tokens using the helper function
    const filteredTokens = useMemo(() => {
        return getDisplayTokens(displayTokens, rawTokenFilters);
    }, [displayTokens, rawTokenFilters]);

    return {
        isLoading,
        error,
        tokens: rawTokenList,
        filteredTokens,
        refetchTokens: refetch,
        addToken: addTokenMutation.mutate,
        removeToken: removeTokenMutation.mutate,
        isAddingToken: addTokenMutation.isPending,
        isRemovingToken: removeTokenMutation.isPending,
        addTokenError: addTokenMutation.error,
        removeTokenError: removeTokenMutation.error,
    };
}

// Hook to fetch and manage user preferences
export function useTokenPreferences() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const {
        rawTokenFilters,
        setRawTokenFilters,
        setPreferencesError,
        setIsLoadingPreferences,
        setHideZeroBalance,
        setHideUnknownToken,
        setSelectedChain,
    } = useTokenStore();

    // Query to fetch user preferences
    const { isLoading, error, refetch } = useQuery({
        queryKey: ["token-preferences", identity?.toString()],
        queryFn: async () => {
            setIsLoadingPreferences(true);
            try {
                const tokenService = new TokenService(identity);
                const preferences = await tokenService.getUserPreference();
                const filters = mapUserPreferenceToFilters(preferences);
                setRawTokenFilters(filters);
                return preferences;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setPreferencesError(error);
                throw error;
            } finally {
                setIsLoadingPreferences(false);
            }
        },
        enabled: !!identity,
        refetchOnWindowFocus: false,
    });

    // Mutation to update user preferences
    const updatePreferencesMutation = useMutation({
        mutationFn: async () => {
            const tokenService = new TokenService(identity);
            const input = mapFiltersToUserPreferenceInput(rawTokenFilters);
            await tokenService.updateUserPreference(input);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["token-preferences", identity?.toString()],
            });
        },
    });

    return {
        isLoading,
        error,
        filters: rawTokenFilters,
        refetchPreferences: refetch,
        updatePreferences: updatePreferencesMutation.mutate,
        isUpdatingPreferences: updatePreferencesMutation.isPending,
        updatePreferencesError: updatePreferencesMutation.error,

        // Direct setters for individual preferences
        setHideZeroBalance: (hide: boolean) => {
            setHideZeroBalance(hide);
        },
        setHideUnknownToken: (hide: boolean) => {
            setHideUnknownToken(hide);
        },
        setSelectedChain: setSelectedChain,
    };
}

// Hook to manage token balances updates
export function useUpdateTokenBalances() {
    const { updateTokenPrices, rawTokenList, setDisplayTokens } = useTokenStore();

    const updateBalances = async (
        tokenBalances: Record<string, { amount: bigint; price?: number }>,
    ) => {
        // Extract prices from balances
        const prices: Record<string, number> = {};

        // Update prices in the store
        Object.entries(tokenBalances).forEach(([tokenId, data]) => {
            if (data.price !== undefined) {
                prices[tokenId] = data.price;
            }
        });

        updateTokenPrices(prices);

        // Update the display tokens with the new balance information
        const updatedTokens: FungibleToken[] = rawTokenList.map((token) => {
            const tokenId = token.icrc_ledger_id?.toString() || "";
            const balanceInfo = tokenBalances[tokenId];

            // Create a base FungibleToken
            const baseToken = mapUserTokenToFungibleToken(token, prices);

            // Update with balance if available
            if (balanceInfo) {
                return {
                    ...baseToken,
                    amount: balanceInfo.amount,
                    usdEquivalent: balanceInfo.price
                        ? Number(balanceInfo.amount) * balanceInfo.price
                        : null,
                };
            }

            return baseToken;
        });

        setDisplayTokens(updatedTokens);
    };

    return { updateBalances };
}

// Hook to search tokens by name or symbol (reusing the existing hook)
export function useTokensBySearchQuery(tokens: FungibleToken[], query: string) {
    return useMemo(() => {
        if (!query.trim()) return tokens;

        const lcSearchQuery = query.toLowerCase().trim();
        return tokens.filter((token) => {
            const lcName = token.name.toLowerCase();
            const lcSymbol = token.symbol.toLowerCase();

            return lcName.includes(lcSearchQuery) || lcSymbol.includes(lcSearchQuery);
        });
    }, [tokens, query]);
}
