import { convertTokenAmountToNumber } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { useCallback, useEffect, useMemo } from "react";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { linkDetailsFormSchema, LinkDetailsFormSchema } from "./link-details-form";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useTokens } from "@/hooks/useTokens";

export type TipLinkAssetFormSchema = LinkDetailsFormSchema;

export function useTipLinkAssetForm(
    assets: FungibleToken[],
    defaultValues?: DefaultValues<TipLinkAssetFormSchema>,
): UseFormReturn<TipLinkAssetFormSchema> {
    const form = useForm<TipLinkAssetFormSchema>({
        resolver: zodResolver(linkDetailsFormSchema(assets)),
        defaultValues: defaultValues,
    });

    const { getToken } = useTokens();

    const tokenData = getToken(form.getValues("tokenAddress"));

    const assetNumber = form.watch("assetNumber");

    // update amount after assetNumber change
    useEffect(() => {
        if (assetNumber && tokenData) {
            const decimals = tokenData?.decimals;
            form.setValue("amount", BigInt(convertTokenAmountToNumber(assetNumber, decimals)));
        }
    }, [assetNumber, tokenData]);

    return form;
}

/**
 * Hook that provides token assets using the shared useTokens hook
 * @returns Token assets and loading states
 */
export function useUserAssets() {
    // Replace the custom queries with useTokens
    const { filteredTokenList, isLoadingBalances, isLoading } = useTokens();

    return {
        assets: filteredTokenList,
        isLoadingAssets: isLoading,
        isLoadingBalance: isLoadingBalances,
    };
}

export function useSelectedAsset(
    assets: FungibleToken[] | undefined,
    form: UseFormReturn<TipLinkAssetFormSchema>,
) {
    const tokenAddress = form.watch("tokenAddress");
    const defaultTokenAddress = form.formState.defaultValues?.tokenAddress;

    useEffect(() => {
        if (assets && assets.length > 0) {
            form.setValue("tokenAddress", defaultTokenAddress || assets[0].address);
        }
    }, [assets]);

    const selectedAsset = useMemo(() => {
        return assets?.find((asset) => asset.address === tokenAddress);
    }, [assets, tokenAddress]);

    return selectedAsset;
}

export function useFormActions(form: UseFormReturn<TipLinkAssetFormSchema>) {
    const tokenAddress = form.watch("tokenAddress");
    const { data: rates } = useConversionRatesQuery(tokenAddress);

    const setTokenAmount = useCallback(
        (input: string | number) => {
            const value = parseFloat(input.toString());
            const isValidValue = !isNaN(value);
            form.setValue("assetNumber", isValidValue ? value : null, { shouldTouch: true });

            if (!rates || !rates.canConvert) return;

            const convertedValue = value * rates.tokenToUsd;
            form.setValue("usdNumber", isValidValue ? convertedValue : 0, { shouldTouch: true });
        },
        [rates],
    );

    const setUsdAmount = useCallback(
        (input: string | number) => {
            const value = parseFloat(input.toString());
            const isValidValue = !isNaN(value);
            form.setValue("usdNumber", isValidValue ? value : 0, { shouldTouch: true });

            if (!rates || !rates.canConvert) return;

            const convertedValue = value * rates.usdToToken;
            form.setValue("assetNumber", isValidValue ? convertedValue : 0, { shouldTouch: true });
        },
        [rates],
    );

    const setTokenAddress = useCallback((address: string) => {
        form.setValue("tokenAddress", address, { shouldTouch: true });
        form.clearErrors("amount");
        form.clearErrors("assetNumber");
        form.clearErrors("usdNumber");
    }, []);

    return {
        setTokenAmount,
        setUsdAmount,
        setTokenAddress,
    };
}
