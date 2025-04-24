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
    useTokenRawListQuery,
    useUpdateUserFiltersMutation,
    useUserPreferencesQuery,
} from "./token-hooks";
import {
    FungibleToken,
    mapTokenModelToFungibleToken,
    TokenModel,
} from "@/types/fungible-token.speculative";
import { ICExplorerService, mapTokenListItemToAddTokenInput } from "@/services/icExplorer.service";

// Main hook that components should use
export function useTokens() {
    const identity = useIdentity();

    // Get Zustand store actions
    const {
        setRawTokenList,
        setUserTokens,
        setFilters,
        setIsLoading,
        setIsLoadingBalances,
        setIsLoadingPrices,
        setIsSyncPreferences,
        setIsImporting,
        filters,
    } = useTokenStore();

    // Use React Query hooks
    const tokenRawListQuery = useTokenRawListQuery();
    const tokenUserListQuery = useTokenListQuery(identity);
    const userPreferencesQuery = useUserPreferencesQuery(identity);
    const tokenMetadataQuery = useTokenMetadataQuery(
        identity ? tokenUserListQuery.data : tokenRawListQuery.data,
    );
    const tokenBalancesQuery = useTokenBalancesQuery(identity ? tokenUserListQuery.data : []);
    const tokenPricesQuery = useTokenPricesQuery();

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
        await tokenUserListQuery.refetch();
    };

    // Toggle a single token's visibility in preferences
    const toggleTokenVisibility = async (tokenId: string, hidden: boolean) => {
        setIsSyncPreferences(true);
        await toggleTokenVisibilityMutation.mutateAsync({ tokenId, hidden });
        await tokenUserListQuery.refetch();
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
        await tokenRawListQuery.refetch();
        if (identity) {
            await tokenUserListQuery.refetch();
            await userPreferencesQuery.refetch();
        }
    };

    const updateToken = async () => {
        console.log("call updateToken");
        if (identity) {
            await tokenUserListQuery.refetch();
            await userPreferencesQuery.refetch();
            await tokenBalancesQuery.refetch();
        }
    };

    const updateTokenExplorer = async () => {
        const explorerService = new ICExplorerService();
        if (!identity) {
            console.error("No identity found");
            return;
        }
        const tokenHold = await explorerService.getUserTokens(identity.getPrincipal().toText());
        const tokenHoldId = tokenHold.map((token) => token.ledgerId);
        // this can be fail
        // TODO: handle if this call is failed
        const tokenList = await explorerService.getListToken();

        if (tokenList.length > 0) {
            const tokensToAdd: AddTokenInput[] = tokenList.map((token) => {
                return mapTokenListItemToAddTokenInput(token);
            });

            await addMultpleTokensMutation.mutateAsync({
                tokens: tokensToAdd,
                token_hold: tokenHoldId,
            });
        }

        await tokenUserListQuery.refetch();
        await tokenBalancesQuery.refetch();
    };

    const updateTokenBalance = async () => {
        await tokenBalancesQuery.refetch();
    };

    // Process raw tokens list (all tokens from registry) and merge with user token enabled status
    useEffect(() => {
        if (!tokenRawListQuery.data) return;

        // Create a lookup map for user tokens by address
        const userTokenMap: Record<string, FungibleToken> = {};

        // Only populate the map if the user is authenticated and has tokens
        if (identity && tokenUserListQuery.data) {
            const userTokens: FungibleToken[] = tokenUserListQuery.data.map((token: TokenModel) => {
                return mapTokenModelToFungibleToken(token);
            });

            // Create a map of user tokens by address for fast lookup
            userTokens.forEach((token) => {
                if (token.address) {
                    userTokenMap[token.address] = token;
                }
            });
        }

        const rawTokens: FungibleToken[] = tokenRawListQuery.data.map((token: TokenModel) => {
            const baseToken = mapTokenModelToFungibleToken(token);

            // If this token exists in user tokens, merge the enabled status
            if (baseToken.address && userTokenMap[baseToken.address]) {
                baseToken.enabled = userTokenMap[baseToken.address].enabled;
            }

            return baseToken;
        });

        // Enrich with metadata and prices
        const enrichedRawTokens = rawTokens.map((token) => {
            const enrichedToken = { ...token };

            // Enrich with metadata
            if (tokenMetadataQuery.data) {
                const metadataMap = tokenMetadataQuery.data;
                const metadata = metadataMap[token.address];
                if (metadata?.fee !== undefined) {
                    enrichedToken.fee = metadata.fee;
                    enrichedToken.logoFallback = metadata.logo;
                }
            }

            // Enrich with price data
            if (tokenPricesQuery.data) {
                const priceMap = tokenPricesQuery.data;
                const price = priceMap[token.address];

                if (price) {
                    enrichedToken.usdConversionRate = price;
                    enrichedToken.usdEquivalent = 0; // Default to 0 for raw tokens without balances
                }
            }

            return enrichedToken;
        });

        // Update raw token list
        setRawTokenList(enrichedRawTokens);
    }, [
        tokenRawListQuery.data,
        tokenMetadataQuery.data,
        tokenPricesQuery.data,
        tokenUserListQuery.data,
        identity,
    ]);

    // Process user tokens list (if authenticated)
    useEffect(() => {
        if (!identity || !tokenUserListQuery.data) return;

        const userTokens: FungibleToken[] = tokenUserListQuery.data.map((token: TokenModel) => {
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

        // Update user token list
        setUserTokens(enrichedUserTokens);

        if (userPreferencesQuery.data) {
            setFilters(userPreferencesQuery.data);
        }
    }, [
        identity,
        tokenUserListQuery.data,
        tokenBalancesQuery.data,
        tokenMetadataQuery.data,
        tokenPricesQuery.data,
        userPreferencesQuery.data,
    ]);

    // Separate useEffect for loading states
    useEffect(() => {
        setIsLoading(
            tokenRawListQuery.isLoading ||
                (!!identity && (tokenUserListQuery.isLoading || userPreferencesQuery.isLoading)),
        );
    }, [
        identity,
        tokenRawListQuery.isLoading,
        tokenUserListQuery.isLoading,
        userPreferencesQuery.isLoading,
    ]);

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
