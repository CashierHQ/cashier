import { z } from "zod";
import { LINK_INTENT_LABEL, CHAIN } from "@/services/types/enum";
import { AssetSelectItem } from "../asset-select";

// Core schema for data that needs to be stored/transmitted
export const linkDetailsFormSchema = z.object({
    tokenAddress: z.string().min(1, { message: "Asset is required" }),
    amount: z.bigint(),
    label: z.nativeEnum(LINK_INTENT_LABEL).optional(),
    chain: z.nativeEnum(CHAIN).optional(),
});

// UI-specific interface for form display and interactions
export interface LinkDetailsFormUI {
    assetNumber: number | null;
    usdNumber: number | null;
}

// Validation function that can be used separately from the schema
export const validateLinkDetails = (
    values: z.infer<typeof linkDetailsFormSchema> & LinkDetailsFormUI,
    assets: AssetSelectItem[],
) => {
    const errors: Record<string, string> = {};

    if (values.assetNumber === null) {
        errors.assetNumber = "Must input number";
        errors.usdNumber = "Must input number";
    }

    const asset = assets.find((asset) => asset.address === values.tokenAddress);

    if (
        !asset ||
        values.assetNumber === null ||
        asset.amount === undefined ||
        values.assetNumber > asset.amount
    ) {
        errors.assetNumber = "Your balance is not enough";
        errors.usdNumber = "Your balance is not enough";
    }

    return errors;
};

export type LinkDetailsFormSchema = z.infer<typeof linkDetailsFormSchema>;
