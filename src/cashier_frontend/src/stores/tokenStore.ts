import { create } from "zustand";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { mapUserTokenToFungibleToken, TokenFilters, TokenState } from "@/types/token-store.type";
import { Chain } from "@/services/types/link.service.types";

export const useTokenStore = create<TokenState>((set) => ({
    // Raw data from backend
    rawTokenList: [],
    rawTokenFilters: {
        hideZeroBalance: false,
        hideUnknownToken: false,
        selectedChain: [Chain.IC],
    },

    // Processed tokens using FungibleToken type
    displayTokens: [],

    // Price data for tokens
    tokenPrices: {},

    // Loading states
    isLoadingTokens: false,
    isLoadingPreferences: false,

    // Error states
    tokensError: null,
    preferencesError: null,

    // Actions
    setRawTokenList: (tokens) => {
        set((state) => {
            // Map raw tokens to FungibleToken type
            const displayTokens = tokens.map((token) =>
                mapUserTokenToFungibleToken(token, state.tokenPrices),
            );
            return { rawTokenList: tokens, displayTokens };
        });
    },

    setRawTokenFilters: (filters) => set({ rawTokenFilters: filters }),

    setDisplayTokens: (tokens) => set({ displayTokens: tokens }),

    updateTokenPrice: (tokenId, price) =>
        set((state) => ({
            tokenPrices: {
                ...state.tokenPrices,
                [tokenId]: price,
            },
        })),

    updateTokenPrices: (prices) =>
        set((state) => ({
            tokenPrices: {
                ...state.tokenPrices,
                ...prices,
            },
        })),

    setIsLoadingTokens: (isLoading) => set({ isLoadingTokens: isLoading }),
    setIsLoadingPreferences: (isLoading) => set({ isLoadingPreferences: isLoading }),

    setTokensError: (error) => set({ tokensError: error }),
    setPreferencesError: (error) => set({ preferencesError: error }),

    // Filter actions
    setHideZeroBalance: (hide) =>
        set((state) => ({
            rawTokenFilters: {
                ...state.rawTokenFilters,
                hideZeroBalance: hide,
            },
        })),

    setHideUnknownToken: (hide) =>
        set((state) => ({
            rawTokenFilters: {
                ...state.rawTokenFilters,
                hideUnknownToken: hide,
            },
        })),

    setSelectedChain: (chains) =>
        set((state) => ({
            rawTokenFilters: {
                ...state.rawTokenFilters,
                selectedChain: chains,
            },
        })),

    // Reset store
    clearStore: () =>
        set({
            rawTokenList: [],
            rawTokenFilters: {
                hideZeroBalance: false,
                hideUnknownToken: false,
                selectedChain: [],
            },
            displayTokens: [],
            tokenPrices: {},
            isLoadingTokens: false,
            isLoadingPreferences: false,
            tokensError: null,
            preferencesError: null,
        }),
}));

// Helper function to get the filtered token list based on current filters
export const getDisplayTokens = (
    tokens: FungibleToken[],
    filters: TokenFilters,
): FungibleToken[] => {
    // Apply filters
    return (
        tokens
            .filter((token) => {
                // Apply zero balance filter
                if (filters.hideZeroBalance && token.amount === BigInt(0)) {
                    return false;
                }

                // Apply chain filter
                if (filters.selectedChain.length > 0) {
                    const tokenChain = token.chain;
                    if (!filters.selectedChain.includes(tokenChain)) {
                        return false;
                    }
                }

                // Apply unknown token filter - based on whether the token has a name/symbol
                if (filters.hideUnknownToken && token.symbol === "???") {
                    return false;
                }

                return true;
            })
            // Sort by price * amount (descending)
            .sort((a, b) => {
                const aValue = (a.usdConversionRate || 0) * Number(a.amount);
                const bValue = (b.usdConversionRate || 0) * Number(b.amount);
                return bValue - aValue;
            })
    );
};
