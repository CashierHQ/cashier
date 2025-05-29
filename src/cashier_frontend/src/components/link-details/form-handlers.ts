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

import { UseFormReturn } from "react-hook-form";
import { UseFieldArrayReturn } from "react-hook-form";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { CHAIN, LINK_TYPE, LINK_INTENT_ASSET_LABEL } from "@/services/types/enum";
import { toast } from "sonner";
import { formatNumber } from "@/utils/helpers/currency";

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
 * Validates form assets for errors
 * @param assets Form asset objects
 * @param allAvailableTokens List of all available tokens
 * @param t Translation function
 * @param options Optional configuration parameters
 * @param options.isAirdrop Whether this is an airdrop form
 * @param options.maxActionNumber Maximum number of actions
 * @param options.skipCheckingBalance Whether to skip checking token balance
 * @returns Boolean indicating if assets are valid
 */
export const validateFormAssets = (
    assets: {
        tokenAddress: string;
        amount: bigint;
        label?: string | LINK_INTENT_ASSET_LABEL | undefined;
        chain?: CHAIN | undefined;
    }[],
    allAvailableTokens: FungibleToken[] | undefined,
    t: (key: string) => string,
    options: {
        isAirdrop?: boolean;
        maxActionNumber?: number;
        skipCheckingBalance?: boolean;
    } = {},
): boolean => {
    // Set default values
    const { isAirdrop = false, maxActionNumber = 1, skipCheckingBalance = false } = options;
    let isValid = true;
    const errorMessages: string[] = [];

    assets.forEach((asset, index) => {
        const token = allAvailableTokens?.find((t) => t.address === asset.tokenAddress);
        const tokenSymbol = token?.symbol || "Unknown";

        // Check amount
        if (!asset.amount || asset.amount === BigInt(0)) {
            const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.amount_error_message")}`;
            errorMessages.push(errorMsg);
            isValid = false;
        }

        // Check chain
        if (!asset.chain) {
            const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.chain_error_message")}`;
            errorMessages.push(errorMsg);
            isValid = false;
        }

        // Check label
        if (!asset.label) {
            const errorMsg = `Asset #${index + 1} (${tokenSymbol}): ${t("create.label_error_message")}`;
            errorMessages.push(errorMsg);
            isValid = false;
        }

        // Check balance
        console.log("skipCheckingBalance", skipCheckingBalance);
        if (
            !skipCheckingBalance &&
            token &&
            token.amount !== null &&
            typeof token.amount !== "undefined"
        ) {
            console.log("token.amount", token.amount);
            // Calculate total amount needed based on form type
            const totalAmountNeeded = isAirdrop
                ? asset.amount * BigInt(maxActionNumber)
                : asset.amount;

            const hasEnoughBalance = Number(totalAmountNeeded) <= Number(token.amount);

            if (!hasEnoughBalance) {
                const availableAmountInDecimal = token?.amount ? Number(token.amount) : 0;
                const requestedAmountInDecimal = Number(totalAmountNeeded);
                const availableAmount =
                    availableAmountInDecimal / (Math.pow(10, token.decimals) || 1);
                const requestedAmount =
                    requestedAmountInDecimal / (Math.pow(10, token.decimals) || 1);
                const errorMsg = `Asset #${index + 1} (${tokenSymbol}): Insufficient balance. Available: ${formatNumber(
                    availableAmount.toString(),
                )}, Requested: ${formatNumber(requestedAmount.toString())}`;
                errorMessages.push(errorMsg);
                isValid = false;
            }
        }
    });

    // Display all errors as a summary if there are multiple issues
    if (errorMessages.length > 0) {
        if (errorMessages.length === 1) {
            // Only one error, show it directly
            toast.error(t("add_asset_form.error.validation.title"), {
                description: errorMessages[0],
            });
        } else {
            toast.error(t("add_asset_form.error.validation.title"), {
                description: `Found ${errorMessages.length} issues:\n${errorMessages
                    .slice(0, 3)
                    .join("\n")}${errorMessages.length > 3 ? "\n...and more" : ""}`,
            });

            // Log all errors to console for debugging
            console.error("Form validation errors:", errorMessages);
        }
    }

    return isValid;
};

/**
 * Check if there's insufficient balance for any asset
 * @param formAssets Form asset objects
 * @param allAvailableTokens List of all available tokens
 * @returns Token symbol with insufficient balance, or null
 */
export const checkInsufficientBalance = (
    formAssets: {
        tokenAddress: string;
        amount: bigint;
    }[],
    allAvailableTokens: FungibleToken[] | undefined,
): string | null => {
    const notEnoughBalanceAssets = formAssets.filter((asset) => {
        const token = allAvailableTokens?.find((t) => t.address === asset.tokenAddress);
        if (!token) return false;
        return Number(asset.amount) > Number(token.amount);
    });

    if (notEnoughBalanceAssets.length > 0) {
        const token = allAvailableTokens?.find(
            (t) => t.address === notEnoughBalanceAssets[0].tokenAddress,
        );
        if (token) {
            return token.symbol || "";
        }
    }

    return null;
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
            label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TIP_ASSET}_${asset.tokenAddress}`;
        }

        return {
            ...asset,
            label,
        };
    });
};
