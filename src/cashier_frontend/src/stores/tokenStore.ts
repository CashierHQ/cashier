// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { create } from "zustand";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { TokenFilters } from "@/types/token-store.type";
import { Chain } from "@/services/types/link.service.types";

// Define the token store state for UI state only
interface TokenState {
    // Raw token data from backend
    rawTokenList: FungibleToken[];

    // UI Filter settings
    filters: TokenFilters;

    // Loading states
    isLoading: boolean;
    isLoadingBalances: boolean;
    isLoadingPrices: boolean;
    isSyncPreferences: boolean;
    isImporting: boolean;

    // UI state
    error: Error | null;
    hasBalances: boolean;

    // Search query for UI
    searchQuery: string;

    // Setters for UI state
    setRawTokenList: (tokens: FungibleToken[]) => void;
    setIsLoading: (isLoading: boolean) => void;
    setIsLoadingBalances: (isLoadingBalances: boolean) => void;
    setIsLoadingPrices: (isLoadingPrices: boolean) => void;
    setIsSyncPreferences: (isSyncPreferences: boolean) => void;
    setIsImporting: (isImporting: boolean) => void;
    setError: (error: Error | null) => void;
    setFilters: (filters: Partial<TokenFilters>) => void;
    setHasBalances: (hasBalances: boolean) => void;
    setSearchQuery: (query: string) => void;
}

// Create the Zustand store with only UI state management
export const useTokenStore = create<TokenState>((set) => ({
    // Initial state
    rawTokenList: [],
    filters: {
        hideZeroBalance: false,
        hideUnknownToken: false,
        selectedChain: [Chain.IC],
        hidden_tokens: [],
    },
    isLoading: false,
    isLoadingBalances: false,
    isLoadingPrices: false,
    isSyncPreferences: false,
    isImporting: false,
    error: null,
    hasBalances: false,
    searchQuery: "",

    // Setters for UI state
    setRawTokenList: (tokens) => {
        const hasBalances = tokens.some((token) => token.amount && token.amount > BigInt(0));
        set({ rawTokenList: tokens, hasBalances });
    },

    setIsLoading: (isLoading) => set({ isLoading }),
    setIsLoadingBalances: (isLoadingBalances) => set({ isLoadingBalances }),
    setIsLoadingPrices: (isLoadingPrices) => set({ isLoadingPrices }),
    setIsSyncPreferences: (isSyncPreferences) => set({ isSyncPreferences }),
    setIsImporting: (isImporting) => set({ isImporting }),
    setError: (error) => set({ error }),
    setHasBalances: (hasBalances) => set({ hasBalances }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),

    setFilters: (filters) => {
        set((state) => ({
            filters: {
                ...state.filters,
                ...filters,
            },
        }));
    },
}));
