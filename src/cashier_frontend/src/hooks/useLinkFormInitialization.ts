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

import { useMemo } from "react";
import {
    CHAIN,
    LINK_TYPE,
    LINK_INTENT_ASSET_LABEL,
    getAssetLabelForLinkType,
} from "@/services/types/enum";
import { UserInputItem } from "@/stores/linkCreationFormStore";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { LinkDetailModel } from "@/services/types/link.service.types";

type InitialFormValues = {
    assets: {
        tokenAddress: string;
        amount: bigint;
        label: string | LINK_INTENT_ASSET_LABEL;
        chain: CHAIN;
    }[];
};

/**
 * Custom hook that initializes form values for link forms
 *
 * @param currentInput The current user input from the store
 * @param allAvailableTokens List of available tokens
 * @param link The current link object
 * @returns Initial values for the form
 */
/**
 * Helper function to get the correct label for a link type and token address
 */
function getCorrectLabel(linkType: string, tokenAddress: string): string {
    if (linkType === LINK_TYPE.SEND_TOKEN_BASKET) {
        return `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TOKEN_BASKET_ASSET}_${tokenAddress}`;
    } else if (linkType === LINK_TYPE.SEND_AIRDROP) {
        return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_AIRDROP_ASSET;
    } else if (linkType === LINK_TYPE.RECEIVE_PAYMENT) {
        return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_RECEIVE_PAYMENT_ASSET;
    } else if (linkType === LINK_TYPE.SEND_TIP) {
        return LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TIP_ASSET;
    } else {
        try {
            // Use the utility function for other link types
            return getAssetLabelForLinkType(linkType, tokenAddress);
        } catch (e) {
            console.error("Error getting asset label:", e);
            return ""; // Fallback to empty string
        }
    }
}

/**
 * Custom hook that initializes form values for link forms
 *
 * @param currentInput The current user input from the store
 * @param allAvailableTokens List of available tokens
 * @param link The current link object
 * @returns Initial values for the form
 */
export function useLinkFormInitialization(
    currentInput: Partial<UserInputItem> | undefined,
    allAvailableTokens: FungibleToken[] | undefined,
    link: LinkDetailModel | null | undefined,
) {
    // Get initial values from current input or link data
    let values = getInitialFormValues(currentInput, link);

    // If link type exists, ensure labels are consistent with the current link type

    if (!link || !link.linkType) {
        return undefined; // or some default value
    }

    if (values && link && link.linkType) {
        // Update labels to match current link type
        values = {
            assets: values.assets.map((asset) => {
                // Generate appropriate label based on current link type
                const updatedLabel = getCorrectLabel(link.linkType!, asset.tokenAddress);

                // Keep all properties except update the label
                return {
                    ...asset,
                    label: updatedLabel,
                };
            }),
        };
    }

    if (!values && allAvailableTokens && allAvailableTokens.length > 0 && link && link.linkType) {
        // Create default values with the first available token if no values exist
        const tokenAddress = allAvailableTokens[0].address;
        const label = getCorrectLabel(link.linkType, tokenAddress);

        return {
            assets: [
                {
                    tokenAddress: tokenAddress,
                    amount: BigInt(0),
                    label: label,
                    chain: CHAIN.IC,
                },
            ],
        };
    }
    return values;
}

/**
 * Helper function to get initial form values from user input or link data
 */
function getInitialFormValues(
    input: Partial<UserInputItem> | undefined,
    link: LinkDetailModel | null,
): InitialFormValues | undefined {
    if (!input?.assets || input.assets.length === 0) {
        // If link has assets but no user input, check if we have link data directly
        if (link?.asset_info && link.asset_info.length > 0) {
            return {
                assets: link.asset_info.map((asset) => {
                    if (asset.label == undefined || asset.chain == undefined) {
                        throw new Error(
                            `Asset label is undefined for asset with address ${asset.address}`,
                        );
                    }
                    return {
                        tokenAddress: asset.address,
                        amount: asset.amountPerUse,
                        label: asset.label,
                        chain: asset.chain,
                    };
                }),
            };
        }
        return undefined;
    }

    return {
        assets: input.assets.map((asset) => ({
            tokenAddress: asset.address,
            amount: asset.linkUseAmount,
            label: asset.label,
            chain: asset.chain,
        })),
    };
}
