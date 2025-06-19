// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { LINK_TYPE } from "@/services/types/enum";

export type LinkTag = "send" | "receive";

/**
 * Get the tag for a given link type
 * @param linkType The type of the link
 * @returns The tag categorizing the link type
 */
export const getLinkTypeTag = (linkType?: LINK_TYPE): LinkTag | undefined => {
    if (!linkType) return undefined;

    const sendTypes = [
        LINK_TYPE.SEND_TIP,
        LINK_TYPE.SEND_AIRDROP,
        LINK_TYPE.SEND_TOKEN_BASKET,
        LINK_TYPE.NFT_CREATE_AND_AIRDROP,
    ];

    const receiveTypes = [LINK_TYPE.RECEIVE_PAYMENT, LINK_TYPE.RECEIVE_MULTI_PAYMENT];

    if (sendTypes.includes(linkType)) {
        return "send";
    }

    if (receiveTypes.includes(linkType)) {
        return "receive";
    }

    return undefined;
};

/**
 * Check if a link type is a send type
 * @param linkType The type of the link
 * @returns boolean indicating if it's a send type
 */
export const isSendLinkType = (linkType?: LINK_TYPE): boolean => {
    return getLinkTypeTag(linkType) === "send";
};

/**
 * Check if a link type is a receive type
 * @param linkType The type of the link
 * @returns boolean indicating if it's a receive type
 */
export const isReceiveLinkType = (linkType?: LINK_TYPE): boolean => {
    return getLinkTypeTag(linkType) === "receive";
};
