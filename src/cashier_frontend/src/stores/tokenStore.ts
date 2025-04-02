import { create } from "zustand";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { Chain } from "@/services/types/link.service.types";
import { AddTokenInput, UserTokenDto } from "../../../declarations/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";
import TokenService from "@/services/token.service";
import {
    mapUserPreferenceToFilters,
    mapUserTokenToFungibleToken,
    TokenFilters,
} from "@/types/token-store.type";
import { Identity } from "@dfinity/agent";
import { TokenUtilService } from "@/services/tokenUtils.service";

// External token explorer service interface (mock)
interface TokenExplorerService {
    fetchAvailableTokens(): Promise<
        {
            address: string;
            name: string;
            symbol: string;
            decimals: number;
            chain: Chain;
        }[]
    >;
}

// Mock balance service
interface BalanceService {
    fetchTokenBalance(tokenAddress: string): Promise<{
        amount: bigint;
        price?: number;
    }>;
    fetchAllBalances(tokenAddresses: string[]): Promise<
        Record<
            string,
            {
                amount: bigint;
                price?: number;
            }
        >
    >;
}

interface TokenStoreState {
    // Raw data
    rawDefaultTokenList: UserTokenDto[];
    rawTokenList: UserTokenDto[];
    rawTokenFilters: TokenFilters;

    // Processed tokens
    filteredTokenList: FungibleToken[];

    // Loading and error states
    isLoading: boolean;
    isBalanceLoading: boolean;
    isPriceLoading: boolean;
    error: Error | null;

    // Initialize and load tokens
    updateTokenListInit: (identity: Identity) => Promise<{ tokens: UserTokenDto[] } | undefined>;

    // Get filtered tokens
    getDisplayTokens: () => FungibleToken[];

    // Token management
    addToken: (identity: Identity, input: AddTokenInput) => Promise<boolean>;
    toggleTokenEnabled: (identity: Identity, tokenId: string, enabled: boolean) => Promise<boolean>;

    // Search functionality
    searchTokens: (query: string, tokens?: FungibleToken[]) => FungibleToken[];

    // Balance management
    updateTokenBalanceAmountAll: (identity: Identity) => Promise<FungibleToken[] | undefined>;
    updateTokenBalanceAmountOne: (
        identity: Identity,
        tokenAddress: string,
    ) => Promise<FungibleToken | undefined>;

    // Token explorer integration
    updateTokenExplorer: (identity: Identity) => Promise<void>;

    // Filter management
    // setHideZeroBalance: (identity: Identity , hide: boolean) => void;
    // setHideUnknownToken: (identity: Identity ,hide: boolean) => void;
    // setSelectedChain: (identity: Identity , chains: string[]) => void;

    // Internal setters
    _setRawDefaultTokenList: (tokens: UserTokenDto[]) => void;
    _setRawTokenList: (tokens: UserTokenDto[]) => void;
    _setFilteredTokenList: (tokens: FungibleToken[]) => void;
    _setLoading: (isLoading: boolean) => void;
    _setBalanceLoading: (isLoading: boolean) => void;
    _setPriceLoading: (isLoading: boolean) => void;
    _setError: (error: Error | null) => void;
    _setRawTokenFilters: (filters: TokenFilters) => void;
}

// Helper function to filter tokens
const filterTokens = (tokens: FungibleToken[], filters: TokenFilters): FungibleToken[] => {
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
                    // This would need mapping between backend and frontend Chain types
                    // For now, assuming if we have IC in backend we want IC in frontend
                    const hasMatchingChain = filters.selectedChain.some((backendChain: string) => {
                        if (backendChain === "IC") {
                            return token.chain === Chain.IC;
                        }
                        return false;
                    });

                    if (!hasMatchingChain) return false;
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

export const useTokenStore = create<TokenStoreState>((set, get) => ({
    // State
    rawDefaultTokenList: [],
    rawTokenList: [],
    rawTokenFilters: {
        hideZeroBalance: false,
        hideUnknownToken: false,
        selectedChain: ["IC"],
    },
    filteredTokenList: [],
    isLoading: false,
    error: null,
    isBalanceLoading: false,
    isPriceLoading: false,

    // Internal setters
    _setRawDefaultTokenList: (tokens) => set({ rawDefaultTokenList: tokens }),
    _setRawTokenList: (tokens) => set({ rawTokenList: tokens }),
    _setFilteredTokenList: (tokens) => set({ filteredTokenList: tokens }),
    _setLoading: (isLoading) => set({ isLoading }),
    _setError: (error) => set({ error }),
    _setRawTokenFilters: (filters) => set({ rawTokenFilters: filters }),
    _setBalanceLoading: (isLoading) => set({ isBalanceLoading: isLoading }),
    _setPriceLoading: (isLoading) => set({ isPriceLoading: isLoading }),

    // Initialize token list and user preferences
    updateTokenListInit: async (identity: Identity) => {
        const {
            _setLoading,
            _setError,
            _setRawTokenList,
            _setFilteredTokenList,
            _setRawTokenFilters,
            _setRawDefaultTokenList,
        } = get();

        try {
            if (!identity) throw new Error("Not authenticated");
            _setLoading(true);
            const tokenService = new TokenService(identity);

            // Fetch tokens and preferences in parallel
            const [tokens, preferences, defaultTokens] = await Promise.all([
                tokenService.listTokens(),
                tokenService.getUserPreference(),
                tokenService.defaultListTokens(),
            ]);

            // Process the data
            const filters = mapUserPreferenceToFilters(preferences);

            const fungibleTokens = tokens.map((token) => mapUserTokenToFungibleToken(token));
            const filteredTokenList = filterTokens(fungibleTokens, filters);

            // Update store
            _setRawTokenList(tokens);
            _setRawTokenFilters(filters);
            _setFilteredTokenList(filteredTokenList);
            _setRawDefaultTokenList(defaultTokens);

            return { tokens, preferences };
        } catch (error) {
            console.error("Failed to initialize token list:", error);
            _setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            _setLoading(false);
        }
    },

    // Get filtered tokens based on current filters
    getDisplayTokens: () => {
        const { filteredTokenList, rawDefaultTokenList } = get();

        // if no tokens return default tokens
        if (filteredTokenList.length === 0) {
            return rawDefaultTokenList.map((token) => mapUserTokenToFungibleToken(token));
        }

        return filteredTokenList;
    },

    // Add a new token
    addToken: async (identity: Identity, input: AddTokenInput) => {
        if (!identity) throw new Error("Not authenticated");

        const { updateTokenListInit, _setLoading, _setError } = get();

        try {
            _setLoading(true);
            const tokenService = new TokenService(identity);
            await tokenService.addToken(input);

            // Refresh token list after adding
            await updateTokenListInit(identity);
            return true;
        } catch (error) {
            console.error("Failed to add token:", error);
            _setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            _setLoading(false);
        }
    },

    // Toggle token enabled status
    toggleTokenEnabled: async (identity, tokenId, enabled) => {
        if (!identity) throw new Error("Not authenticated");

        const { rawTokenList, updateTokenListInit, _setLoading, _setError } = get();

        try {
            _setLoading(true);
            // Find the token in raw list
            const token = rawTokenList.find(
                (t) => t.icrc_ledger_id && t.icrc_ledger_id.toString() === tokenId,
            );

            if (!token) throw new Error("Token not found");

            // Create a modified version with enabled status toggled
            const updatedToken: AddTokenInput = {
                chain: token.chain,
                ledger_id: token.icrc_ledger_id,
                index_id: token.icrc_index_id,
                symbol: token.symbol,
                decimals: token.decimals,
                enabled: [enabled],
                unknown: token.unknown ? [token.unknown] : [],
            };

            // Remove the existing token first
            const tokenService = new TokenService(identity);
            await tokenService.removeToken({
                chain: token.chain,
                ledger_id: token.icrc_ledger_id,
            });

            // Add the updated token
            await tokenService.addToken(updatedToken);

            // Refresh token list
            await updateTokenListInit(identity);
            return true;
        } catch (error) {
            console.error("Failed to toggle token enabled status:", error);
            _setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            _setLoading(false);
        }
    },

    // Search tokens by name or symbol
    searchTokens: (query, tokens = get().filteredTokenList) => {
        if (!query.trim()) return tokens;

        const lcSearchQuery = query.toLowerCase().trim();
        return tokens.filter((token) => {
            const lcName = token.name.toLowerCase();
            const lcSymbol = token.symbol.toLowerCase();

            return lcName.includes(lcSearchQuery) || lcSymbol.includes(lcSearchQuery);
        });
    },

    // Update balance and price for all tokens
    updateTokenBalanceAmountAll: async (identity) => {
        const {
            filteredTokenList,
            _setFilteredTokenList: _setDisplayTokens,
            _setBalanceLoading,
            _setError,
        } = get();

        if (!identity || filteredTokenList.length === 0) return;

        try {
            console.log(
                "🚀 ~ TokenStore ~ updateTokenBalanceAmountAll ~ filteredTokenList:",
                filteredTokenList,
            );
            _setBalanceLoading(true);
            // Mock balance service - in real implementation, inject this service
            const tokenUtilService = new TokenUtilService(identity);

            // Get all token addresses
            const tokenAddresses = filteredTokenList.map((token) => token.address);

            console.log(
                "🚀 ~ TokenStore ~ updateTokenBalanceAmountAll ~ tokenAddresses:",
                tokenAddresses,
            );

            // Fetch all balances
            const balances = await Promise.all(
                tokenAddresses.map(async (address) => {
                    const balanceInfo = await tokenUtilService.balanceOf(address);
                    return {
                        address,
                        amount: balanceInfo,
                    };
                }),
            );

            console.log("🚀 ~ TokenStore ~ updateTokenBalanceAmountAll ~ balances:", balances);

            // Update display tokens with new balance information
            const updatedTokens = filteredTokenList.map((token, index) => {
                const balanceInfo = balances[index];

                if (balanceInfo) {
                    return {
                        ...token,
                        amount: balanceInfo.amount,
                    };
                }

                return token;
            });

            // Update store with new balance information
            _setDisplayTokens(updatedTokens);

            return updatedTokens;
        } catch (error) {
            console.error("Failed to update token balances:", error);
            _setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            console.log(
                "🚀 ~ TokenStore ~ updateTokenBalanceAmountAll ~ filteredTokenList:",
                filteredTokenList,
            );
            _setBalanceLoading(false);
        }
    },

    // Update balance and price for a single token
    updateTokenBalanceAmountOne: async (identity, tokenAddress) => {
        if (!identity) return;

        const {
            filteredTokenList: displayTokens,
            _setFilteredTokenList: _setDisplayTokens,
            _setLoading,
            _setError,
        } = get();

        try {
            _setLoading(true);
            // Mock balance service - in real implementation, inject this service
            const balanceService: BalanceService = {
                async fetchTokenBalance(address) {
                    // This would be your actual implementation to fetch balance
                    console.log("Fetching balance for", address);
                    return { amount: BigInt(0) }; // Replace with actual implementation
                },
                async fetchAllBalances() {
                    return {}; // Not used here
                },
            };

            // Find the token in display tokens
            const tokenIndex = displayTokens.findIndex((t) => t.address === tokenAddress);

            if (tokenIndex === -1) {
                throw new Error("Token not found");
            }

            // Fetch balance for the specific token
            const balanceInfo = await balanceService.fetchTokenBalance(tokenAddress);

            // Update the specific token
            const updatedTokens = [...displayTokens];
            updatedTokens[tokenIndex] = {
                ...updatedTokens[tokenIndex],
                amount: balanceInfo.amount,
                usdConversionRate: balanceInfo.price || updatedTokens[tokenIndex].usdConversionRate,
                usdEquivalent: balanceInfo.price
                    ? (Number(balanceInfo.amount) * balanceInfo.price) /
                      10 ** updatedTokens[tokenIndex].decimals
                    : updatedTokens[tokenIndex].usdEquivalent,
            };

            // Update store with new token information
            _setDisplayTokens(updatedTokens);

            return updatedTokens[tokenIndex];
        } catch (error) {
            console.error(`Failed to update token balance for ${tokenAddress}:`, error);
            _setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            _setLoading(false);
        }
    },

    // Sync tokens from explorer service
    updateTokenExplorer: async (identity: Identity): Promise<void> => {
        // Explicitly specify return type as Promise<void>

        const { rawTokenList, updateTokenListInit, _setLoading, _setError } = get();

        try {
            _setLoading(true);
            // Mock token explorer service - in real implementation, inject this service
            const explorerService: TokenExplorerService = {
                async fetchAvailableTokens() {
                    // This would be your actual implementation to fetch available tokens
                    return []; // Replace with actual implementation
                },
            };

            // Get current token addresses from raw list
            const currentTokenAddresses = rawTokenList
                .filter((token) => token.icrc_ledger_id)
                .map((token) => token.icrc_ledger_id!.toString());

            // Fetch available tokens from explorer
            const availableTokens = await explorerService.fetchAvailableTokens();

            // Find new tokens
            const newTokens = availableTokens.filter(
                (token) => !currentTokenAddresses.includes(token.address),
            );

            // Add new tokens
            const tokenService = new TokenService(identity);
            for (const token of newTokens) {
                await tokenService.addToken({
                    chain: "IC",
                    ledger_id: [Principal.fromText(token.address)],
                    index_id: [],
                    symbol: [token.symbol],
                    decimals: [token.decimals],
                    enabled: [true],
                    unknown: [false],
                });
            }

            // Refresh token list if any new tokens were added
            if (newTokens.length > 0) {
                await updateTokenListInit(identity);
            }

            // Don't return anything, or explicitly return undefined
            return;
        } catch (error) {
            console.error("Failed to update tokens from explorer:", error);
            _setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            _setLoading(false);
        }
    },

    //   // Filter actions
    // setHideZeroBalance: (hide) => set((state) => ({
    //   rawTokenFilters: {
    //     ...state.rawTokenFilters,
    //     hideZeroBalance: hide
    //   }
    // })),

    //   setHideUnknownToken: (hide) => set((state) => ({
    //     rawTokenFilters: {
    //       ...state.rawTokenFilters,
    //       hideUnknownToken: hide
    //     }
    //   })),

    //   setSelectedChain: (chains) => set((state) => ({
    //     rawTokenFilters: {
    //       ...state.rawTokenFilters,
    //       selectedChain: chains
    //     }
    //   }))
}));
