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

import { z } from "zod";
import { LINK_INTENT_ASSET_LABEL, CHAIN } from "@/services/types/enum";
import { AssetSelectItem } from "../asset-select";

// Define a single asset schema
export const assetSchema = z.object({
    tokenAddress: z.string().min(1, { message: "Asset is required" }),
    amount: z.bigint(),
    label: z.union([z.nativeEnum(LINK_INTENT_ASSET_LABEL), z.string()]).optional(),
    chain: z.nativeEnum(CHAIN).optional(),
});

// Core schema for data that needs to be stored/transmitted
export const linkDetailsFormSchema = z.object({
    // We'll always use an array of assets, even for a single asset
    assets: z.array(assetSchema).min(1, { message: "At least one asset is required" }),
});

// For backward compatibility with existing code
export interface LinkDetailsFormUI {
    // These fields will be deprecated in favor of assets array
    tokenAddress?: string;
    amount?: bigint;
    label?: LINK_INTENT_ASSET_LABEL | string;
    chain?: CHAIN;
}

export type Asset = z.infer<typeof assetSchema>;
export type LinkDetailsFormSchema = z.infer<typeof linkDetailsFormSchema>;

/**
 * Convert from assetNumber (number) to amount (bigint)
 * This function should be used when converting user input to the actual amount
 */
export const assetNumberToAmount = (assetNumber: number | null, decimals: number = 8): bigint => {
    if (assetNumber === null) return BigInt(0);
    return BigInt(Math.round(assetNumber * Math.pow(10, decimals)));
};

// Validation function that can be used separately from the schema
export const validateAsset = (asset: Asset, availableAssets: AssetSelectItem[]) => {
    const errors: Record<string, string> = {};

    const availableAsset = availableAssets.find((a) => a.address === asset.tokenAddress);

    if (!availableAsset || asset.amount === undefined) {
        errors.amount = "Your balance is not enough";
    }

    return errors;
};
