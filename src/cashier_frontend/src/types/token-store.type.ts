// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
    Chain as BackendChain,
    TokenDto,
} from "../../../declarations/token_storage/token_storage.did";
import { TokenModel } from "@/types/fungible-token.speculative";
import { Chain } from "@/services/types/link.service.types";
import { IC_EXPLORER_IMAGES_PATH } from "@/const";

export interface TokenFilters {
    hideZeroBalance: boolean;
    hideUnknownToken: boolean;
    selectedChain: string[];
}

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
    const tokenId = token.details.IC.ledger_id?.toString() || "";

    let enable = false;
    if ("enabled" in token) {
        enable = token.enabled;
    }

    return {
        id: token.id,
        address: tokenId,
        chain: mapStringToFrontendChain(token.chain),
        name: token.name?.toString() || "Unknown Token",
        symbol: token.symbol?.toString() || "???",
        logo: `${IC_EXPLORER_IMAGES_PATH}${tokenId}`, // Would need to be populated from elsewhere
        decimals: token.decimals || 8,
        enabled: enable,
        fee: token.details.IC.fee,
    };
};
