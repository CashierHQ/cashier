import {
    Chain as BackendChain,
    UserPreference,
    UserPreferenceInput,
    UserTokenDto,
} from "../../../declarations/token_storage/token_storage.did";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { Chain } from "@/services/types/link.service.types";
import { fromDefinedNullable } from "@dfinity/utils";

export interface TokenFilters {
    hideZeroBalance: boolean;
    hideUnknownToken: boolean;
    selectedChain: Chain[];
}

export interface TokenState {
    // Raw data from backend
    rawTokenList: UserTokenDto[];
    rawTokenFilters: TokenFilters;

    // Processed tokens using FungibleToken type
    displayTokens: FungibleToken[];

    // Price data for tokens
    tokenPrices: Record<string, number>;

    // Loading states
    isLoadingTokens: boolean;
    isLoadingPreferences: boolean;

    // Error states
    tokensError: Error | null;
    preferencesError: Error | null;

    // Actions
    setRawTokenList: (tokens: UserTokenDto[]) => void;
    setRawTokenFilters: (filters: TokenFilters) => void;
    setDisplayTokens: (tokens: FungibleToken[]) => void;
    updateTokenPrice: (tokenId: string, price: number) => void;
    updateTokenPrices: (prices: Record<string, number>) => void;

    setIsLoadingTokens: (isLoading: boolean) => void;
    setIsLoadingPreferences: (isLoading: boolean) => void;

    setTokensError: (error: Error | null) => void;
    setPreferencesError: (error: Error | null) => void;

    // Filter actions
    setHideZeroBalance: (hide: boolean) => void;
    setHideUnknownToken: (hide: boolean) => void;
    setSelectedChain: (chains: Chain[]) => void;

    // Reset functions
    clearStore: () => void;
}

// Helper function to create a key for token balances
export const createTokenKey = (token: UserTokenDto): string => {
    if (token.icrc_ledger_id) {
        return token.icrc_ledger_id.toString();
    }
    return "";
};

// Helper function to map UserPreference to TokenFilters
export const mapUserPreferenceToFilters = (preference: UserPreference): TokenFilters => {
    return {
        hideZeroBalance: preference.hide_zero_balance,
        hideUnknownToken: preference.hide_unknown_token,
        selectedChain: preference.selected_chain.map((chain) => {
            return mapBackendChainToFrontend(chain);
        }),
    };
};

// Helper function to map TokenFilters to UserPreferenceInput
export const mapFiltersToUserPreferenceInput = (filters: TokenFilters): UserPreferenceInput => {
    return {
        hide_zero_balance: filters.hideZeroBalance,
        hide_unknown_token: filters.hideUnknownToken,
        selected_chain: filters.selectedChain.map((chain) => {
            return mapChainToString(chain);
        }),
    };
};

// Helper function to map backend Chain to frontend Chain
export const mapBackendChainToFrontend = (chain: BackendChain): Chain => {
    if ("IC" in chain) {
        return Chain.IC;
    }

    throw new Error(`Unsupported backend chain: ${JSON.stringify(chain)}`);
};

export const mapStringToFrontendChain = (chain: string): Chain => {
    switch (chain) {
        case "IC":
            return Chain.IC;
        default:
            throw new Error(`Unsupported chain: ${chain}`);
    }
};

export const mapChainToString = (chain: Chain): string => {
    switch (chain) {
        case Chain.IC:
            return "IC";
        default:
            throw new Error(`Unsupported chain: ${chain}`);
    }
};

export const mapStringToBackendChain = (chain: string): BackendChain => {
    switch (chain) {
        case "IC":
            return { IC: null };
        default:
            throw new Error(`Unsupported chain: ${chain}`);
    }
};

// Helper function to map UserToken to FungibleToken
export const mapUserTokenToFungibleToken = (
    token: UserTokenDto,
    prices: Record<string, number> = {},
): FungibleToken => {
    const tokenId = token.icrc_ledger_id?.toString() || "";
    const price = prices[tokenId] || null;

    return {
        address: tokenId,
        chain: mapStringToFrontendChain(token.chain),
        name: token.symbol?.toString() || "Unknown Token",
        symbol: token.symbol?.toString() || "???",
        logo: "", // Would need to be populated from elsewhere
        decimals: fromDefinedNullable(token.decimals) || 8,
        amount: BigInt(0), // Default to zero, would be updated from balance info
        usdEquivalent: null, // Would be calculated based on amount and price
        usdConversionRate: price,
    };
};
