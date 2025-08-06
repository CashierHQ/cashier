// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { UseFormReturn } from "react-hook-form";
import { UseFieldArrayReturn } from "react-hook-form";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { CHAIN, LINK_TYPE, LINK_INTENT_ASSET_LABEL } from "@/services/types/enum";

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
