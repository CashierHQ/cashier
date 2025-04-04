import { create } from "zustand";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";
import { mapChainToString, TokenFilters } from "@/types/token-store.type";
import { Chain } from "@/services/types/link.service.types";

// Define the token store state and actions
// In tokenStore.ts - Update the store interface
interface TokenState {
    // Original data
    tokens: FungibleToken[];

    // Filtered data
    filteredTokens: FungibleToken[];

    // Filter settings
    filters: TokenFilters;

    // Status
    isLoading: boolean;
    isLoadingBalances: boolean;
    error: Error | null;
    hasBalances: boolean;

    // Setters
    setTokens: (tokens: FungibleToken[]) => void;
    setFilteredTokens: (tokens: FungibleToken[]) => void;
    setFilters: (filters: TokenFilters) => void;
    setIsLoading: (isLoading: boolean) => void;
    setIsLoadingBalances: (isLoading: boolean) => void;
    setError: (error: Error | null) => void;
    setHasBalances: (hasBalances: boolean) => void;

    // Filter operations
    applyFilters: () => void;

    // Token operations
    searchTokens: (query: string) => FungibleToken[];
    addToken: (input: AddTokenInput) => Promise<void>;
    toggleTokenEnabled: (tokenId: string, enabled: boolean) => Promise<void>;
    refreshTokens: () => Promise<void>;
    refreshBalances: () => Promise<void>;
    cacheBalances: (tokens: FungibleToken[]) => Promise<void>;
}

// Create the Zustand store with updated implementation
export const useTokenStore = create<TokenState>((set, get) => ({
    // Initial state
    tokens: [],
    filteredTokens: [],
    filters: {
        hideZeroBalance: false,
        hideUnknownToken: false,
        selectedChain: [Chain.IC],
        hidden_tokens: [],
    },
    isLoading: false,
    isLoadingBalances: false,
    error: null,
    hasBalances: false,

    // Setters
    setTokens: (tokens) => {
        set({ tokens });
        // Auto-apply filters when tokens change
        get().applyFilters();
    },
    setFilteredTokens: (filteredTokens) => set({ filteredTokens }),
    setFilters: (filters) => {
        set({ filters });
        // Auto-apply filters when filters change
        get().applyFilters();
    },
    setIsLoading: (isLoading) => set({ isLoading }),
    setIsLoadingBalances: (isLoadingBalances) => set({ isLoadingBalances }),
    setError: (error) => set({ error }),
    setHasBalances: (hasBalances) => set({ hasBalances }),

    // Filter operations
    applyFilters: () => {
        const { tokens, filters } = get();

        const filtered = tokens.filter((token) => {
            // Apply hide zero balance filter
            if (filters.hideZeroBalance && (!token.amount || token.amount === BigInt(0))) {
                return false;
            }

            // Apply hide unknown token filter (you'll need to define what makes a token "unknown")
            if (filters.hideUnknownToken && !token.name) {
                return false;
            }

            // Apply chain filter if any chains are selected
            if (
                filters.selectedChain.length > 0 &&
                !filters.selectedChain.includes(mapChainToString(token.chain))
            ) {
                return false;
            }

            return true;
        });

        set({ filteredTokens: filtered });
    },

    // Search operations - now operating on filteredTokens
    searchTokens: (query) => {
        const { filteredTokens } = get();
        if (!query.trim()) return filteredTokens;

        const lcQuery = query.toLowerCase().trim();
        return filteredTokens.filter((token) => {
            return (
                token.name.toLowerCase().includes(lcQuery) ||
                token.symbol.toLowerCase().includes(lcQuery)
            );
        });
    },

    // Placeholders for operations to be implemented in the integration hook
    addToken: async () => {
        throw new Error("Not implemented");
    },
    toggleTokenEnabled: async () => {
        throw new Error("Not implemented");
    },
    refreshTokens: async () => {
        throw new Error("Not implemented");
    },
    refreshBalances: async () => {
        throw new Error("Not implemented");
    },
    cacheBalances: async () => {
        throw new Error("Not implemented");
    },
}));
