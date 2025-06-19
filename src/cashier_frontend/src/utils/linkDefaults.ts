// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { LINK_TYPE } from "@/services/types/enum";

/**
 * Get the default max action number for a given link type
 * @param linkType - The type of link
 * @returns The default max action number for the link type
 */
export function getDefaultMaxActionNumber(linkType: string): number {
    switch (linkType) {
        case LINK_TYPE.SEND_TIP:
            // Tips are always single use only
            return 1;

        case LINK_TYPE.SEND_AIRDROP:
            // Airdrops can have multiple claims, default to 1
            return 1;

        case LINK_TYPE.SEND_TOKEN_BASKET:
            // Token baskets are always single use only
            return 1;

        case LINK_TYPE.RECEIVE_PAYMENT:
            // Payment links can accept multiple payments, default to 1
            return 1;

        default:
            // Default fallback for unknown link types
            return 1;
    }
}
