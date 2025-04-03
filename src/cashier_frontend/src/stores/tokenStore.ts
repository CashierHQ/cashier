import { create } from "zustand";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";

// Define the token store state and actions
interface TokenState {
    // Data
    tokens: FungibleToken[];

    // Status
    isLoading: boolean;
    isLoadingBalances: boolean;
    error: Error | null;
    hasBalances: boolean;

    // Setters (to be called from React Query hooks)
    setTokens: (tokens: FungibleToken[]) => void;
    setIsLoading: (isLoading: boolean) => void;
    setIsLoadingBalances: (isLoading: boolean) => void;
    setError: (error: Error | null) => void;
    setHasBalances: (hasBalances: boolean) => void;

    // Operations
    searchTokens: (query: string) => FungibleToken[];

    // These will be implemented in the integration hook
    addToken: (input: AddTokenInput) => Promise<void>;
    toggleTokenEnabled: (tokenId: string, enabled: boolean) => Promise<void>;
    refreshTokens: () => Promise<void>;
    refreshBalances: () => Promise<void>;
}

// Create the Zustand store
export const useTokenStore = create<TokenState>((set, get) => ({
    // Initial state
    tokens: [],
    isLoading: false,
    isLoadingBalances: false,
    error: null,
    hasBalances: false,

    // Setters
    setTokens: (tokens) => set({ tokens }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setIsLoadingBalances: (isLoadingBalances) => set({ isLoadingBalances }),
    setError: (error) => set({ error }),
    setHasBalances: (hasBalances) => set({ hasBalances }),

    // Operations
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

    // Placeholders for functions to be implemented in the integration hook
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
}));
