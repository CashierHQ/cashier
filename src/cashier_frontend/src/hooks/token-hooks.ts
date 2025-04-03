import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Identity } from "@dfinity/agent";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { mapUserTokenToFungibleToken } from "@/types/token-store.type";
import TokenStorageService from "@/services/backend/tokenStorage.service";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";

// Centralized query keys for consistent caching
export const TOKEN_QUERY_KEYS = {
    all: ["tokens"] as const,
    list: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "list", principalId] as const,
    balances: (principalId?: string) => [...TOKEN_QUERY_KEYS.all, "balances", principalId] as const,
    preferences: (principalId?: string) =>
        [...TOKEN_QUERY_KEYS.all, "preferences", principalId] as const,
};
// Hook 1: Fetch basic token list
export function useTokenListQuery(identity: Identity | undefined) {
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.list(identity?.getPrincipal().toString()),
        queryFn: async () => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            const tokens = await tokenService.listTokens();

            // Initialize user tokens if none exist
            if (tokens.length === 0) {
                await tokenService.initializeUserTokens();
                return tokenService.listTokens();
            }

            return tokens;
        },
        select: (data) => {
            // Transform to frontend model
            return data.map((token) => mapUserTokenToFungibleToken(token));
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!identity,
    });
}

// Hook 2: Fetch token balances
export function useTokenBalancesQuery(
    tokens: FungibleToken[] | undefined,
    identity: Identity | undefined,
) {
    return useQuery({
        queryKey: TOKEN_QUERY_KEYS.balances(identity?.getPrincipal().toString()),
        queryFn: async () => {
            if (!identity || !tokens || tokens.length === 0) {
                return [];
            }

            const tokenUtilService = new TokenUtilService(identity);

            // Fetch balances in parallel
            const tokenPromises = tokens.map(async (token) => {
                try {
                    const balance = await tokenUtilService.balanceOf(token.address);

                    return {
                        ...token,
                        amount: balance,
                    };
                } catch (error) {
                    console.error(`Error fetching balance for ${token.address}:`, error);
                    return token; // Return token unchanged on error
                }
            });

            return Promise.all(tokenPromises);
        },
        enabled: !!identity && !!tokens && tokens.length > 0,
        staleTime: 60 * 1000, // 1 minute (balances change more frequently)
    });
}

// Add token mutation
export function useAddTokenMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: AddTokenInput) => {
            if (!identity) throw new Error("Not authenticated");

            const tokenService = new TokenStorageService(identity);
            await tokenService.addToken(input);
            return true;
        },
        onSuccess: () => {
            // Invalidate token queries
            queryClient.invalidateQueries({ queryKey: TOKEN_QUERY_KEYS.all });
        },
    });
}

// Toggle token enabled mutation
export function useToggleTokenEnabledMutation(identity: Identity | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ tokenId, enabled }: { tokenId: string; enabled: boolean }) => {
            if (!identity) throw new Error("Not authentiated");

            const tokenService = new TokenStorageService(identity);
            // await tokenService.toggleTokenEnabled(tokenId, enabled);
            return true;
        },
        onSuccess: () => {
            // Invalidate token queries
            queryClient.invalidateQueries({ queryKey: TOKEN_QUERY_KEYS.all });
        },
    });
}
