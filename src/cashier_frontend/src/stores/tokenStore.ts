import { create } from "zustand";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { AddTokenInput } from "../../../declarations/token_storage/token_storage.did";
import { mapChainToString, TokenFilters } from "@/types/token-store.type";
import { Chain } from "@/services/types/link.service.types";

// Define the token store state and actions
interface TokenState {
    // Original data
    rawTokenList: FungibleToken[];

    // Filtered data
    userTokens: FungibleToken[];

    // Filter settings
    filters: TokenFilters;

    // Status
    isLoading: boolean;
    isLoadingBalances: boolean;
    isLoadingPrices: boolean;
    isSyncPreferences: boolean;
    isImporting: boolean;
    error: Error | null;
    hasBalances: boolean;

    // Setters
    setRawTokenList: (tokens: FungibleToken[]) => void;
    setUserTokens: (tokens: FungibleToken[]) => void;
    setFilteredTokens: (tokens: FungibleToken[]) => void;
    setFilters: (filters: TokenFilters) => void;
    setIsLoading: (isLoading: boolean) => void;
    setIsLoadingBalances: (isLoadingBalances: boolean) => void;
    setIsLoadingPrices: (isLoadingPrices: boolean) => void;
    setIsSyncPreferences: (isSyncPreferences: boolean) => void;
    setIsImporting: (isImporting: boolean) => void;
    setError: (error: Error | null) => void;

    // Getters
    getToken(tokenAddress: string): FungibleToken | undefined;
    getTokenPrice(tokenAddress: string): number | undefined;
    // Get the display token based on filters
    getDisplayTokens(): FungibleToken[];

    // Create a map of tokens by address
    createTokenMap(): Record<string, FungibleToken>;

    // Token operations
    searchTokens: (query: string) => FungibleToken[];

    // Backend operations - these get implemented by useTokens
    addToken: (input: AddTokenInput) => Promise<void>;
    removeToken: (tokenId: string) => Promise<void>;
    toggleTokenVisibility: (tokenId: string, hidden: boolean) => Promise<void>;
    batchToggleTokenVisibility: (toggles: Array<[string, boolean]>) => Promise<void>;
    updateUserFilters: (filterUpdates: Partial<TokenFilters>) => Promise<void>;
    updateTokenInit: () => Promise<void>;
    updateToken: () => Promise<void>;
    updateTokenExplorer: () => Promise<void>;
    updateTokenBalance: () => Promise<void>;
}

// Create the Zustand store with updated implementation
export const useTokenStore = create<TokenState>((set, get) => ({
    // Initial state
    rawTokenList: [],
    userTokens: [],
    filters: {
        hideZeroBalance: false,
        hideUnknownToken: false,
        selectedChain: [Chain.IC],
        hidden_tokens: [],
    },
    isLoading: false,
    isLoadingBalances: false,
    isSyncPreferences: false,
    isLoadingPrices: false,
    isImporting: false,
    error: null,
    hasBalances: false,

    // Setters
    setRawTokenList: (tokens) => {
        set({ rawTokenList: tokens });
    },
    setUserTokens: (tokens) => {
        set({ userTokens: tokens });
    },
    setFilteredTokens: (filteredTokens) => set({ userTokens: filteredTokens }),
    setFilters: (filters) => {
        set({ filters });
    },
    setIsLoading: (isLoading) => set({ isLoading }),
    setIsLoadingBalances: (isLoadingBalances) => set({ isLoadingBalances }),
    setIsLoadingPrices: (isLoadingPrices) => set({ isLoadingPrices }),
    setIsSyncPreferences: (isSyncPreferences) => set({ isSyncPreferences }),
    setIsImporting: (isImporting) => set({ isImporting }),
    setError: (error) => set({ error }),

    // Getters
    getToken: (tokenAddress) => {
        const { userTokens } = get();
        return userTokens.find((token) => token.address === tokenAddress);
    },

    getTokenPrice: (tokenAddress) => {
        const { rawTokenList } = get();
        const token = rawTokenList.find((token) => token.address === tokenAddress);
        return token?.usdConversionRate;
    },

    // Create a map of tokens by address
    createTokenMap: () => {
        const { rawTokenList } = get();
        return rawTokenList.reduce(
            (map, token) => {
                map[token.address] = token;
                return map;
            },
            {} as Record<string, FungibleToken>,
        );
    },

    getDisplayTokens: () => {
        const { userTokens: tokens, filters } = get();

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

        // Sort tokens by USD equivalent, then by balance
        filtered.sort((a, b) => {
            // First sort tokens with USD value to the top
            const aHasPrice = a.usdEquivalent !== undefined && !isNaN(a.usdEquivalent);
            const bHasPrice = b.usdEquivalent !== undefined && !isNaN(b.usdEquivalent);

            if (aHasPrice && !bHasPrice) return -1;
            if (!aHasPrice && bHasPrice) return 1;

            // For tokens that both have prices, sort by value (highest first)
            if (aHasPrice && bHasPrice) {
                return (b.usdEquivalent as number) - (a.usdEquivalent as number);
            }

            // For tokens without prices, sort by balance (highest first)
            // Convert BigInt to number safely for comparison
            const aBalance = a.amount ? Number(a.amount) / Math.pow(10, a.decimals || 8) : 0;
            const bBalance = b.amount ? Number(b.amount) / Math.pow(10, b.decimals || 8) : 0;

            return bBalance - aBalance;
        });

        return filtered;
    },

    // Search operations - now operating on filteredTokens
    searchTokens: (query) => {
        const { rawTokenList: tokens } = get();
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
