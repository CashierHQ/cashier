import useTokenMetadataQuery from "@/hooks/useTokenMetadataQuery";
import { convertTokenAmountToNumber } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { useCallback, useEffect, useMemo } from "react";
import * as z from "zod";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { FungibleToken } from "@/types/fungible-token.speculative";

export const walletSendAssetFormSchema = (assets: FungibleToken[]) => {
    return z
        .object({
            address: z.string().min(1, { message: "Asset is required" }),
            amount: z.bigint(),
            assetNumber: z
                .number({ message: "Must input number" })
                .positive({ message: "Must be greater than 0" })
                .nullable(),
            walletAddress: z.string().min(1, { message: "Wallet address is required" }),
        })
        .superRefine((val, ctx) => {
            if (val.assetNumber === null) {
                ctx.addIssue({
                    code: "custom",
                    message: "Must input number",
                    path: ["assetNumber"],
                });
            }
        });
};

export type WalletSendAssetFormSchema = z.infer<ReturnType<typeof walletSendAssetFormSchema>>;

export function useWalletSendAssetForm(
    assets: FungibleToken[],
    defaultValues?: DefaultValues<WalletSendAssetFormSchema>,
): UseFormReturn<WalletSendAssetFormSchema> {
    const form = useForm<WalletSendAssetFormSchema>({
        resolver: zodResolver(walletSendAssetFormSchema(assets)),
        defaultValues: defaultValues,
    });

    const { data: tokenData } = useTokenMetadataQuery(form.getValues("address"));

    const assetNumber = form.watch("assetNumber");

    // update amount after assetNumber change
    useEffect(() => {
        if (assetNumber && tokenData) {
            const decimals = tokenData?.metadata.decimals;

            form.setValue("amount", BigInt(convertTokenAmountToNumber(assetNumber, decimals)));
        }
    }, [assetNumber, tokenData]);

    return form;
}

export function useSelectedWalletSendAsset(
    assets: FungibleToken[] | undefined,
    form: UseFormReturn<WalletSendAssetFormSchema>,
) {
    const tokenAddress = form.watch("address");
    const defaultTokenAddress = form.formState.defaultValues?.address;

    useEffect(() => {
        if (assets && assets.length > 0) {
            form.setValue("address", defaultTokenAddress || assets[0].address);
        }
    }, [assets]);

    const selectedAsset = useMemo(() => {
        return assets?.find((asset) => asset.address === tokenAddress);
    }, [assets, tokenAddress]);

    return selectedAsset;
}

export function useWalletSendAssetFormActions(form: UseFormReturn<WalletSendAssetFormSchema>) {
    const tokenAddress = form.watch("address");
    const { data: rates } = useConversionRatesQuery(tokenAddress);

    const setTokenAmount = useCallback(
        (input: string | number) => {
            const value = parseFloat(input.toString());
            const isValidValue = !isNaN(value);
            form.setValue("assetNumber", isValidValue ? value : null, { shouldTouch: true });

            if (!rates || !rates.canConvert) return;

            //form.setValue("usdNumber", isValidValue ? convertedValue : 0, { shouldTouch: true });
        },
        [rates],
    );

    const setUsdAmount = useCallback(
        (input: string | number) => {
            const value = parseFloat(input.toString());
            const isValidValue = !isNaN(value);
            //form.setValue("usdNumber", isValidValue ? value : 0, { shouldTouch: true });

            if (!rates || !rates.canConvert) return;

            const convertedValue = value * rates.usdToToken;
            form.setValue("assetNumber", isValidValue ? convertedValue : 0, { shouldTouch: true });
        },
        [rates],
    );

    const setTokenAddress = useCallback((address: string) => {
        form.setValue("address", address, { shouldTouch: true });
        form.clearErrors("amount");
        form.clearErrors("assetNumber");
        //form.clearErrors("usdNumber");
    }, []);

    const setWalletAddress = useCallback((address: string) => {
        form.setValue("walletAddress", address, { shouldTouch: true });
    }, []);

    return {
        setTokenAmount,
        setUsdAmount,
        setTokenAddress,
        setWalletAddress,
    };
}
