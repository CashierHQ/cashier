/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { useCallback, useEffect, useMemo } from "react";
import {
    linkDetailsFormSchema,
    LinkDetailsFormSchema,
    validateAsset,
    assetNumberToAmount,
} from "./link-details-form";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useTokens } from "@/hooks/useTokens";
import { useTokenStore } from "@/stores/tokenStore";
import { LINK_INTENT_LABEL, CHAIN } from "@/services/types/enum";

// Combined type for the form that includes both core data and UI fields
export type TipLinkAssetFormSchema = LinkDetailsFormSchema;

export function useAddAssetForm(
    availableAssets: FungibleToken[],
    defaultValues?: DefaultValues<TipLinkAssetFormSchema>,
): UseFormReturn<TipLinkAssetFormSchema> {
    // Create form with the new schema
    const form = useForm<TipLinkAssetFormSchema>({
        resolver: zodResolver(linkDetailsFormSchema),
        defaultValues: defaultValues,
        mode: "onChange",
    });

    const { getToken } = useTokens();

    // Function to validate a specific asset
    const validateSingleAsset = useCallback(
        (assetIndex: number) => {
            const asset = form.getValues(`assets.${assetIndex}`);
            if (availableAssets.length > 0 && asset.amount !== undefined) {
                console.log("Validating asset:", availableAssets);
                const errors = validateAsset(asset, availableAssets);

                console.log("Validation errors:", errors);
                // Clear previous errors
                form.clearErrors([
                    `assets.${assetIndex}.tokenAddress`,
                    `assets.${assetIndex}.amount`,
                ]);

                // Set errors if any found
                Object.entries(errors).forEach(([field, message]) => {
                    form.setError(`assets.${assetIndex}.${field}` as any, {
                        type: "custom",
                        message,
                    });
                });
            }
        },
        [availableAssets, form, getToken],
    );

    // Watch for changes in assets and validate them
    const assets = form.watch("assets");

    useEffect(() => {
        if (!assets) return;
        assets.forEach((_, index) => {
            validateSingleAsset(index);
        });
    }, [assets, validateSingleAsset]);

    // Update amount when assetNumber changes using our utility functions
    useEffect(() => {
        if (!assets) return;
        assets.forEach((asset, index) => {
            const tokenData = getToken(asset.tokenAddress);

            if (tokenData) {
                form.setValue(`assets.${index}.amount`, asset.amount);
            }
        });
    }, [assets, getToken, form]);

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
    availableAssets: FungibleToken[] | undefined,
    form: UseFormReturn<TipLinkAssetFormSchema>,
    assetIndex: number = 0,
) {
    const tokenAddress = form.watch(`assets.${assetIndex}.tokenAddress`);

    useEffect(() => {
        if (availableAssets && availableAssets.length > 0 && !tokenAddress) {
            form.setValue(`assets.${assetIndex}.tokenAddress`, availableAssets[0].address);
        }
    }, [availableAssets, assetIndex, form, tokenAddress]);

    const selectedAsset = useMemo(() => {
        return availableAssets?.find((asset) => asset.address === tokenAddress);
    }, [availableAssets, tokenAddress]);

    return selectedAsset;
}

export function useFormActions(
    form: UseFormReturn<TipLinkAssetFormSchema>,
    isUsd: boolean,
    assetIndex: number = 0,
) {
    const tokenAddress = form.watch(`assets.${assetIndex}.tokenAddress`);
    const getTokenPrice = useTokenStore((state) => state.getTokenPrice);
    const { getToken } = useTokens();
    const tokenUsdPrice = getTokenPrice(tokenAddress);
    const token = getToken(tokenAddress);
    const decimals = token?.decimals || 8;

    const setTokenAmount = useCallback(
        (input: string | number) => {
            const value = parseFloat(input.toString());
            const isValidValue = !isNaN(value);

            // Update the amount (the source of truth)
            if (isValidValue) {
                const amount = assetNumberToAmount(value, decimals);
                form.setValue(`assets.${assetIndex}.amount`, amount, { shouldTouch: true });
            } else {
                form.setValue(`assets.${assetIndex}.amount`, BigInt(0), { shouldTouch: true });
            }
        },
        [tokenUsdPrice, form, assetIndex, decimals],
    );

    const setUsdAmount = useCallback(
        (input: string | number) => {
            const value = parseFloat(input.toString());
            const isValidValue = !isNaN(value);

            // Update the USD number

            if (!tokenUsdPrice || !isValidValue) {
                form.setValue(`assets.${assetIndex}.amount`, BigInt(0), { shouldTouch: true });
                return;
            }

            // Convert USD to token amount
            const tokenValue = value / tokenUsdPrice;

            // Update the amount (source of truth)
            const amount = assetNumberToAmount(tokenValue, decimals);
            form.setValue(`assets.${assetIndex}.amount`, amount, { shouldTouch: true });
        },
        [tokenUsdPrice, form, assetIndex, decimals],
    );

    const setTokenAddress = useCallback(
        (address: string) => {
            form.setValue(`assets.${assetIndex}.tokenAddress`, address, { shouldTouch: true });
            form.clearErrors(`assets.${assetIndex}.amount`);

            // Reset values when changing token
            form.setValue(`assets.${assetIndex}.amount`, BigInt(0), { shouldTouch: true });
        },
        [form, getTokenPrice, assetIndex, getToken],
    );

    const addAsset = useCallback(() => {
        const assets = form.getValues("assets");
        form.setValue("assets", [
            ...assets,
            {
                tokenAddress: "",
                amount: BigInt(0),
                label: LINK_INTENT_LABEL.INTENT_LABEL_SEND_TIP_ASSET,
                chain: CHAIN.IC,
            },
        ]);
    }, [form]);

    const removeAsset = useCallback(
        (index: number) => {
            const assets = form.getValues("assets");
            // Prevent removing the last asset
            if (assets.length <= 1) return;

            form.setValue(
                "assets",
                assets.filter((_, i) => i !== index),
            );
        },
        [form],
    );

    return {
        setTokenAmount,
        setUsdAmount,
        setTokenAddress,
        addAsset,
        removeAsset,
    };
}
