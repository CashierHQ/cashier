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

import { Chain } from "@/services/types/link.service.types";

export type FungibleToken = TokenModel & TokenMetadata & TokenBalance & TokenPrice;

export type TokenModel = {
    id: string;
    address: string;
    chain: Chain;
    enabled: boolean;
    name: string;
    symbol: string;
    decimals: number;
    logo: string;
    // only use for display, enrich from ledger metadata
    logoFallback?: string;
};

export interface TokenMetadata {
    fee?: bigint;
    logo?: string;
    decimals?: number;
}

export interface TokenBalance {
    amount?: bigint;
}

export interface TokenPrice {
    usdEquivalent?: number;
    usdConversionRate?: number;
}

export type TokenMetadataMap = Record<string, TokenMetadata>;
export type TokenBalanceMap = Record<string, TokenBalance>;
export type TokenPriceMap = Record<string, number>;

export const mapTokenModelToFungibleToken = (
    token: TokenModel,
    fee: bigint | undefined = undefined,
    amount: bigint | undefined = undefined,
    usdEquivalent: number | undefined = undefined,
    usdConversionRate: number | undefined = undefined,
): FungibleToken => {
    return {
        ...token,
        fee,
        amount,
        usdEquivalent,
        usdConversionRate,
    };
};
