import {
    Chain as BackendChain,
    TokenDto,
    UserFiltersInput,
    UserPreference,
} from "../../../declarations/token_storage/token_storage.did";
import { TokenModel } from "@/types/fungible-token.speculative";
import { Chain } from "@/services/types/link.service.types";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { toNullable } from "@dfinity/utils";

export interface TokenFilters {
    hideZeroBalance: boolean;
    hideUnknownToken: boolean;
    selectedChain: string[];
    hidden_tokens: string[];
}

// Helper function to create a key for token balances
export const createTokenKey = (token: TokenDto): string => {
    if (token.icrc_ledger_id) {
        return token.icrc_ledger_id.toString();
    }
    return "";
};

// Helper function to map UserPreference to TokenFilters
export const mapUserPreferenceToFilters = (preference: UserPreference): TokenFilters => {
    console.log("[mapUserPreferenceToFilters] User preference", preference);
    return {
        hideZeroBalance: preference.hide_zero_balance,
        hideUnknownToken: preference.hide_unknown_token,
        selectedChain: preference.selected_chain.map((chain) => {
            return mapBackendChainToFrontend(chain);
        }),
        hidden_tokens: preference.hidden_tokens,
    };
};

// Helper function to map TokenFilters to UserPreferenceInput
export const mapFiltersToUserFiltersInput = (filters: TokenFilters): UserFiltersInput => {
    return {
        hide_zero_balance: toNullable(filters.hideZeroBalance),
        hide_unknown_token: toNullable(filters.hideUnknownToken),
        selected_chain: toNullable(filters.selectedChain),
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
export const mapTokenDtoToTokenModel = (token: TokenDto): TokenModel => {
    const tokenId = token.icrc_ledger_id?.toString() || "";

    return {
        id: token.id,
        address: tokenId,
        chain: mapStringToFrontendChain(token.chain),
        name: token.symbol?.toString() || "Unknown Token",
        symbol: token.symbol?.toString() || "???",
        logo: `${IC_EXPLORER_IMAGES_PATH}${tokenId}`, // Would need to be populated from elsewhere
        decimals: token.decimals || 8,
        enabled: token.enabled || false,
    };
};
