// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import {
    Chain as BackendChain,
    TokenDto,
} from "../../../declarations/token_storage/token_storage.did";
import { TokenModel } from "@/types/fungible-token.speculative";
import { Chain } from "@/services/types/link.service.types";
import { IC_EXPLORER_IMAGES_PATH } from "@/const";
import { fromNullable } from "@dfinity/utils";

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
    const tokenId = token.icrc_ledger_id?.toString() || "";

    let enable = false;
    if ("enabled" in token) {
        enable = token.enabled;
    }

    return {
        id: token.id,
        address: tokenId,
        chain: mapStringToFrontendChain(token.chain),
        name: token.symbol?.toString() || "Unknown Token",
        symbol: token.symbol?.toString() || "???",
        logo: `${IC_EXPLORER_IMAGES_PATH}${tokenId}`, // Would need to be populated from elsewhere
        decimals: token.decimals || 8,
        enabled: enable,
        fee: fromNullable(token.fee || undefined),
    };
};
