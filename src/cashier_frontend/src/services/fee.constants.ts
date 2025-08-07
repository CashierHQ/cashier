// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { AssetInfo, FeeConfig, FeeTable } from "@/services/types/fee.types";
import { CHAIN, FEE_TYPE, LINK_TYPE } from "./types/enum";

// Default ICP token address
export const ICP_TOKEN_ADDRESS = "ryjl3-tyaaa-aaaaa-aaaba-cai";
export const TEST_ICP_TOKEN_ADDRESS = "x5qut-viaaa-aaaar-qajda-cai";

// Default fee amounts in smallest units (e8s for ICP)
// export const DEFAULT_CREATION_FEE = BigInt(100000); // 0.001 ICP
export const DEFAULT_CREATION_FEE = BigInt(10_000); // 0.0001 ICP

// Create a key from chain and link type for fee table lookups
export const createFeeKey = (chain: string, linkType: string, feeType: string): string => {
    return `${chain}:${linkType}:${feeType}`;
};

// Default ICP asset info for fees
const createDefaultIcpAssetInfo = (amount: bigint): AssetInfo => ({
    address: ICP_TOKEN_ADDRESS,
    chain: CHAIN.IC,
    amount,
    symbol: "ICP",
    decimals: 8,
});

// Initialize the default fee table
const initDefaultFeeTable = (): FeeTable => {
    const feeTable = new Map<string, FeeConfig>();

    // Add default network fees for each link type on the IC chain
    [
        LINK_TYPE.SEND_TIP,
        LINK_TYPE.SEND_TOKEN_BASKET,
        LINK_TYPE.SEND_AIRDROP,
        LINK_TYPE.RECEIVE_PAYMENT,
    ].forEach((linkType) => {
        // Creation fee
        const creationFeeKey = createFeeKey(CHAIN.IC, linkType, FEE_TYPE.LINK_CREATION);
        feeTable.set(creationFeeKey, {
            chain: CHAIN.IC,
            linkType,
            feeType: FEE_TYPE.LINK_CREATION,
            asset: createDefaultIcpAssetInfo(DEFAULT_CREATION_FEE),
        });
    });

    return feeTable;
};

// Export the default fee table
export const DEFAULT_FEE_TABLE = initDefaultFeeTable();
