// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { TokenDto } from "../generated/token_storage/token_storage.did";
import { TokenModel } from "@/types/fungible-token.speculative";
import { Chain } from "@/services/types/link.service.types";
import { IC_EXPLORER_IMAGES_PATH } from "@/const";

export interface TokenFilters {
    hideZeroBalance: boolean;
    hideUnknownToken: boolean;
    selectedChain: string[];
}

const mapStringToFrontendChain = (chain: string): Chain => {
    switch (chain) {
        case "IC":
            return Chain.IC;
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
