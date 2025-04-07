import { z } from "zod";
import { LINK_INTENT_LABEL, CHAIN } from "@/services/types/enum";
import { AssetSelectItem } from "../asset-select";

export const linkDetailsFormSchema = (assets: AssetSelectItem[]) => {
    return z
        .object({
            tokenAddress: z.string().min(1, { message: "Asset is required" }),
            amount: z.bigint(),
            assetNumber: z
                .number({ message: "Must input number" })
                .positive({ message: "Must be greater than 0" })
                .nullable(),
            usdNumber: z
                .number({ message: "Must input number" })
                .positive({ message: "Must be greater than 0" })
                .nullable(),
            label: z.nativeEnum(LINK_INTENT_LABEL).optional(),
            chain: z.nativeEnum(CHAIN).optional(),
        })
        .superRefine((val, ctx) => {
            if (val.assetNumber === null) {
                ctx.addIssue({
                    code: "custom",
                    message: "Must input number",
                    path: ["usdNumber"],
                });
                ctx.addIssue({
                    code: "custom",
                    message: "Must input number",
                    path: ["assetNumber"],
                });
            }

            const asset = assets.find((asset) => asset.address === val.tokenAddress);

            if (
                !asset ||
                val.assetNumber === null ||
                asset.amount === undefined ||
                val.assetNumber > asset.amount
            ) {
                ctx.addIssue({
                    code: "custom",
                    message: "Your balance is not enough",
                    path: ["assetNumber"],
                });
                ctx.addIssue({
                    code: "custom",
                    message: "Your balance is not enough",
                    path: ["usdNumber"],
                });
            }
        });
};

export type LinkDetailsFormSchema = z.infer<ReturnType<typeof linkDetailsFormSchema>>;
