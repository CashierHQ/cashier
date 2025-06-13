// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
    fee?: bigint;
    amount?: bigint;
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
    usdEquivalent: number | undefined = undefined,
    usdConversionRate: number | undefined = undefined,
): FungibleToken => {
    return {
        ...token,
        fee,
        amount: token.amount,
        usdEquivalent,
        usdConversionRate,
    };
};
