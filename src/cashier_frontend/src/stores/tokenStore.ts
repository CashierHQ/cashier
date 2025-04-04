import { create } from "zustand";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";
import { mapChainToString, TokenFilters } from "@/types/token-store.type";
import { Chain } from "@/services/types/link.service.types";

// Define the token store state and actions
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
    isSyncPreferences: boolean;
    isImporting: boolean;
    error: Error | null;
    hasBalances: boolean;

    // Setters
    setTokens: (tokens: FungibleToken[]) => void;
    setFilteredTokens: (tokens: FungibleToken[]) => void;
    setFilters: (filters: TokenFilters) => void;
    setIsLoading: (isLoading: boolean) => void;
    setIsLoadingBalances: (isLoading: boolean) => void;
    setIsSyncPreferences: (isSyncPreferences: boolean) => void;
    setIsImporting: (isImporting: boolean) => void;
    setError: (error: Error | null) => void;
    setHasBalances: (hasBalances: boolean) => void;

    // Filter operations
    applyFilters: () => void;

    // Token operations
    searchTokens: (query: string) => FungibleToken[];

    // Backend operations - these get implemented by useTokens
    addToken: (input: AddTokenInput) => Promise<void>;
    removeToken: (tokenId: string) => Promise<void>;
    toggleTokenVisibility: (tokenId: string, hidden: boolean) => Promise<void>;
    batchToggleTokenVisibility: (toggles: Array<[string, boolean]>) => Promise<void>;
    updateUserFilters: (filterUpdates: Partial<TokenFilters>) => Promise<void>;
    refreshTokens: () => Promise<void>;
    refreshBalances: () => Promise<void>;
    cacheBalances: (tokens: FungibleToken[]) => Promise<void>;

    updateTokenInit: () => Promise<void>;
    updateToken: () => Promise<void>;
    updateTokenExplorer: () => Promise<void>;
    updateTokenBalance: () => Promise<void>;
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
    isSyncPreferences: false,
    isImporting: false,
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
    setIsSyncPreferences: (isSyncPreferences) => set({ isSyncPreferences }),
    setIsImporting: (isImporting) => set({ isImporting }),
    setError: (error) => set({ error }),
    setHasBalances: (hasBalances) => set({ hasBalances }),

    // Filter operations
    applyFilters: () => {
        const { tokens, filters } = get();

        let filtered = tokens.slice();

        // Apply hide zero balance filter
        if (filters.hideZeroBalance) {
            filtered = filtered.filter((token) => token.amount && token.amount > BigInt(0));
        }

        // Apply hide unknown token filter
        if (filters.hideUnknownToken) {
            filtered = filtered.filter(
                (token) =>
                    token.name &&
                    token.name.trim() !== "" &&
                    token.symbol &&
                    token.symbol.trim() !== "",
            );
        }

        // Apply chain filter if any chains are selected
        if (filters.selectedChain.length > 0) {
            filtered = filtered.filter((token) =>
                filters.selectedChain.includes(mapChainToString(token.chain)),
            );
        }

        // Apply hidden tokens filter
        if (filters.hidden_tokens && filters.hidden_tokens.length > 0) {
            filtered = filtered.filter((token) => !filters.hidden_tokens.includes(token.id));
        }

        set({ filteredTokens: filtered });
    },

    // Search operations - now operating on filteredTokens
    searchTokens: (query) => {
        const { tokens } = get();
        if (!query.trim()) return tokens;

        const lcQuery = query.toLowerCase().trim();
        return tokens.filter((token) => {
            return (
                token.name.toLowerCase().includes(lcQuery) ||
                token.symbol.toLowerCase().includes(lcQuery)
            );
        });
    },

    // These functions will be implemented by the useTokens hook
    addToken: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    removeToken: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    toggleTokenVisibility: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    batchToggleTokenVisibility: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    updateUserFilters: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    refreshTokens: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    refreshBalances: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    cacheBalances: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    updateTokenInit: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    updateToken: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    updateTokenExplorer: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
    updateTokenBalance: async () => {
        throw new Error("Not implemented - will be set by useTokens hook");
    },
}));
