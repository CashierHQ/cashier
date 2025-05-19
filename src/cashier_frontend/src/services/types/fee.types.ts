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
