// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { UseFormReturn } from "react-hook-form";
import { UseFieldArrayReturn } from "react-hook-form";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { CHAIN, LINK_TYPE, LINK_INTENT_ASSET_LABEL } from "@/services/types/enum";
import { FeeHelpers } from "@/services/fee.service";
import { ValidationService } from "@/services/validation.service";

/**
 * Creates an asset select handler function for opening the asset drawer
 * @param setEditingAssetIndex Function to set the index of the asset being edited
 * @param setShowAssetDrawer Function to show/hide the asset drawer
 * @returns A function that takes an index and opens the asset drawer for that asset
 */
export const createAssetSelectHandler = (
    setEditingAssetIndex: React.Dispatch<React.SetStateAction<number>>,
    setShowAssetDrawer: React.Dispatch<React.SetStateAction<boolean>>,
) => {
    return (index: number) => {
        setEditingAssetIndex(index);
        setShowAssetDrawer(true);
    };
};

/**
 * Creates a token address handler function for setting a token address in the form
 * @param editingAssetIndex Current index of the asset being edited
 * @param link Current link object
 * @param setValue Form setValue function
 * @param selectedAssetAddresses Array of currently selected asset addresses
 * @param setSelectedAssetAddresses Function to update selected asset addresses
 * @param setShowAssetDrawer Function to show/hide the asset drawer
 * @returns A function that handles selecting a token address
 */
export const createTokenAddressHandler = (
    editingAssetIndex: number,
    link: LinkDetailModel | null,
    setValue: UseFormReturn<{
        assets: {
            tokenAddress: string;
            amount: bigint;
            label?: string | LINK_INTENT_ASSET_LABEL;
            chain?: CHAIN;
        }[];
    }>["setValue"],
    selectedAssetAddresses: string[],
    setSelectedAssetAddresses: React.Dispatch<React.SetStateAction<string[]>>,
    setShowAssetDrawer: React.Dispatch<React.SetStateAction<boolean>>,
) => {
    return (address: string) => {
        if (editingAssetIndex < 0 || !link?.id) return;

        // Reset the amount values when selecting a new token
        setValue(`assets.${editingAssetIndex}.tokenAddress`, address);
        setValue(`assets.${editingAssetIndex}.amount`, BigInt(0));

        const updatedAssets = [...selectedAssetAddresses];
        updatedAssets[editingAssetIndex] = address;
        setSelectedAssetAddresses(updatedAssets);
        setShowAssetDrawer(false);
    };
};

/**
 * Creates a remove asset handler function
 * @param getValues Form getValues function
 * @param setSelectedAssetAddresses Function to update selected asset addresses
 * @param assetFields UseFieldArray for asset fields
 * @returns A function that removes an asset from the form
 */
export const createRemoveAssetHandler = (
    getValues: UseFormReturn<{
        assets: {
            tokenAddress: string;
            amount: bigint;
            label?: string | LINK_INTENT_ASSET_LABEL;
            chain?: CHAIN;
        }[];
    }>["getValues"],
    setSelectedAssetAddresses: React.Dispatch<React.SetStateAction<string[]>>,
    assetFields: UseFieldArrayReturn<
        {
            assets: {
                tokenAddress: string;
                amount: bigint;
                label?: string | LINK_INTENT_ASSET_LABEL;
                chain?: CHAIN;
            }[];
        },
        "assets",
        "id"
    >,
) => {
    return (index: number) => {
        const removedAsset = getValues(`assets.${index}`);
        setSelectedAssetAddresses((prev) =>
            prev.filter((address) => address !== removedAsset.tokenAddress),
        );
        assetFields.remove(index);
    };
};

/**
 * Validates form assets for errors - now uses unified validation system with token map
 * @param assets Form asset objects
 * @param tokenMap Map of all available tokens for O(1) lookup
 * @param t Translation function
 * @param options Optional configuration parameters
 * @param options.isAirdrop Whether this is an airdrop form
 * @param options.maxActionNumber Maximum number of actions
 * @param options.skipCheckingBalance Whether to skip checking token balance
 * @returns Boolean indicating if assets are valid and error messages
 */
export const validateFormAssets = (
    assets: {
        tokenAddress: string;
        amount: bigint;
        label?: string | LINK_INTENT_ASSET_LABEL | undefined;
        chain?: CHAIN | undefined;
    }[],
    tokenMap: Record<string, FungibleToken>,
    t: (key: string, options?: Record<string, unknown>) => string,
    options: {
        isAirdrop?: boolean;
        maxActionNumber?: number;
        skipCheckingBalance?: boolean;
    } = {},
): {
    isValid: boolean;
    errorMessages: string[];
} => {
    const { isAirdrop = false, maxActionNumber = 1, skipCheckingBalance = false } = options;

    // Convert assets to FormAsset format
    const formAssets = assets.map((asset) => ({
        tokenAddress: asset.tokenAddress,
        amount: asset.amount,
        chain: asset.chain || CHAIN.IC,
        label: asset.label,
    }));

    // Use the unified validation system
    const linkType = isAirdrop ? LINK_TYPE.SEND_AIRDROP : LINK_TYPE.SEND_TIP;
    const result = ValidationService.validateAssetsWithFees(formAssets, tokenMap, {
        useCase: "create",
        linkType,
        maxActionNumber,
        includeLinkCreationFee: false,
        skipBalanceCheck: skipCheckingBalance,
    });

    // Convert validation errors to error messages using translation
    const errorMessages = result.errors.map((error) => {
        if (error.metadata && error.message.startsWith("error.")) {
            return t(error.message, error.metadata);
        }
        return error.message;
    });

    // Basic validation for required fields (amount, chain, label)
    assets.forEach((asset, index) => {
        const token = tokenMap[asset.tokenAddress]; // O(1) lookup
        const tokenSymbol = token?.symbol || "Unknown";
        // Check amount
        if (!asset.amount || asset.amount === BigInt(0)) {
            const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.amount_error_message")}`;
            errorMessages.push(errorMsg);
        }

        // Check chain
        if (!asset.chain) {
            const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.chain_error_message")}`;
            errorMessages.push(errorMsg);
        }

        // Check label
        if (!asset.label) {
            const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.label_error_message")}`;
            errorMessages.push(errorMsg);
        }
    });

    return {
        isValid: result.isValid && errorMessages.length === 0,
        errorMessages,
    };
};

/**
 * Calculate total fees for a token including network fees and link creation fee
 * @param token The fungible token
 * @param includeLinkCreationFee Whether to include link creation fee
 * @returns Total fees in token's smallest unit
 */
export const calculateTotalFees = (
    token: FungibleToken,
    includeLinkCreationFee: boolean = true,
): bigint => {
    const networkFees = FeeHelpers.calculateNetworkFeesInES8(token);
    const linkCreationFee = includeLinkCreationFee
        ? FeeHelpers.getLinkCreationFee().amount
        : BigInt(0);
    return networkFees + linkCreationFee;
};

/**
 * Calculate total fees for multiple assets - now uses unified validation system
 * @param assets Array of asset objects with token addresses and amounts
 * @param tokenMap HashMap of tokens for O(1) lookup
 * @param maxUses Number of uses for the link
 * @param includeLinkCreationFee Whether to include link creation fee (only once per link)
 * @returns Object with total fees broken down by token or error symbol
 */
export const calculateTotalFeesForAssets = (
    assets: { tokenAddress: string; amount: bigint }[],
    tokenMap: Record<string, FungibleToken>,
    maxUses: number = 1,
    includeLinkCreationFee: boolean = false,
): string | null => {
    // Use the unified validation system from ValidationService
    return ValidationService.calculateTotalFeesForAssets(
        assets,
        tokenMap,
        maxUses,
        includeLinkCreationFee,
    );
};

/**
 * Formats assets for submission with correct labels based on link type
 * @param formAssets Form asset objects
 * @param link Current link object
 * @returns Assets formatted with correct labels
 */
export const formatAssetsForSubmission = (
    formAssets: {
        tokenAddress: string;
        amount: bigint;
        label?: string | LINK_INTENT_ASSET_LABEL | undefined;
        chain?: CHAIN | undefined;
    }[],
    link: LinkDetailModel | null,
) => {
    if (!link?.linkType) return formAssets;

    return formAssets.map((asset) => {
        let label = asset.label || "";

        // Assign the correct label based on link type
        if (link.linkType === LINK_TYPE.SEND_TOKEN_BASKET) {
            label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TOKEN_BASKET_ASSET}_${asset.tokenAddress}`;
        } else if (link.linkType === LINK_TYPE.SEND_AIRDROP) {
            label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_AIRDROP_ASSET}`;
        } else if (link.linkType === LINK_TYPE.RECEIVE_PAYMENT) {
            label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_RECEIVE_PAYMENT_ASSET}`;
        } else if (link.linkType === LINK_TYPE.SEND_TIP) {
            label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TIP_ASSET}`;
        }

        return {
            ...asset,
            label,
        };
    });
};
