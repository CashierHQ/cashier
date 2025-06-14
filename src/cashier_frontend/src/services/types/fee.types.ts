// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { CHAIN, FEE_TYPE, LINK_TYPE } from "./enum";

// Asset information structure
export interface AssetInfo {
    // Asset identifier
    address: string;
    // Chain where the asset exists
    chain: CHAIN;
    // Fee amount in the smallest denomination
    amount: bigint;
    // Optional symbol for easier display
    symbol?: string;
    // Optional number of decimals for formatting
    decimals?: number;
}

// Fee configuration for a specific chain and link type
export interface FeeConfig {
    // Chain for which this fee applies
    chain: CHAIN;
    // Link type for which this fee applies
    linkType: LINK_TYPE;
    // Type of fee
    feeType: FEE_TYPE;
    // The asset information for this fee
    asset: AssetInfo;
}

// Fee table mapping for easy lookup
export type FeeTable = Map<string, FeeConfig>;
