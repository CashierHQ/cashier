import { convertTokenAmountToNumber } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { useCallback, useEffect, useMemo } from "react";
import {
    linkDetailsFormSchema,
    LinkDetailsFormSchema,
    LinkDetailsFormUI,
    validateLinkDetails,
} from "./link-details-form";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useTokens } from "@/hooks/useTokens";
import { useTokenStore } from "@/stores/tokenStore";

// Interface for multi-asset support
export interface MultiAsset {
    tokenAddress: string;
    amount: bigint;
}

// Combined type for the form that includes both core data and UI fields
export type TipLinkAssetFormSchema = LinkDetailsFormSchema &
    LinkDetailsFormUI & {
        multiAssets?: MultiAsset[];
    };

export function useTipLinkAssetForm(
    assets: FungibleToken[],
    defaultValues?: DefaultValues<TipLinkAssetFormSchema>,
): UseFormReturn<TipLinkAssetFormSchema> {
    // Create form with core schema
    const form = useForm<TipLinkAssetFormSchema>({
        resolver: zodResolver(linkDetailsFormSchema),
        defaultValues: defaultValues,
        mode: "onChange", // This will validate on change instead of just on submit
    });

    const { getToken } = useTokens();
    const tokenAddress = form.watch("tokenAddress");
    const assetNumber = form.watch("assetNumber");
    const tokenData = getToken(tokenAddress);

    // Validate UI fields separately
    useEffect(() => {
        const values = form.getValues();
        const errors = validateLinkDetails(values, assets);

        // Clear previous errors first
        form.clearErrors(["tokenAddress", "assetNumber", "amount"]);

        // Set errors if any found
        Object.entries(errors).forEach(([field, message]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            form.setError(field as any, { type: "custom", message });
        });

        // Additional balance validation
        if (tokenData && assetNumber !== null && assetNumber > 0) {
            const tokenAmount = Number(tokenData.amount) / 10 ** (tokenData.decimals || 8);
            if (assetNumber > tokenAmount) {
                form.setError("assetNumber", {
                    type: "custom",
                    message: "Insufficient balance",
                });
            }
        }
    }, [assets, tokenAddress, assetNumber, tokenData, form]);

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

export function useFormActions(form: UseFormReturn<TipLinkAssetFormSchema>, isUsd: boolean) {
    const tokenAddress = form.watch("tokenAddress");
    const getTokenPrice = useTokenStore((state) => state.getTokenPrice);
    const tokenUsdPrice = getTokenPrice(tokenAddress);

    const setTokenAmount = useCallback(
        (input: string | number) => {
            const value = parseFloat(input.toString());
            const isValidValue = !isNaN(value);
            form.setValue("assetNumber", isValidValue ? value : null, { shouldTouch: true });

            if (!tokenUsdPrice) return;

            const convertedValue = value * tokenUsdPrice;
            form.setValue("usdNumber", isValidValue ? convertedValue : null, { shouldTouch: true });
        },
        [tokenUsdPrice, form],
    );

    const setUsdAmount = useCallback(
        (input: string | number) => {
            const value = parseFloat(input.toString());
            const isValidValue = !isNaN(value);
            form.setValue("usdNumber", isValidValue ? value : null, { shouldTouch: true });

            if (!tokenUsdPrice) return;

            const convertedValue = value / tokenUsdPrice;
            form.setValue("assetNumber", isValidValue ? convertedValue : null, {
                shouldTouch: true,
            });
        },
        [tokenUsdPrice, form],
    );

    const setTokenAddress = useCallback(
        (address: string) => {
            form.setValue("tokenAddress", address, { shouldTouch: true });
            form.clearErrors("amount");
            form.clearErrors("assetNumber");
            form.clearErrors("usdNumber");

            const newTokenPrice = getTokenPrice(address);
            if (!newTokenPrice) return;

            if (isUsd) {
                // In USD mode: keep USD input value, update token amount display
                const usdNumber = form.getValues("usdNumber");
                if (usdNumber !== null) {
                    const newTokenAmount = usdNumber / newTokenPrice;
                    form.setValue("assetNumber", newTokenAmount, { shouldTouch: true });
                }
            } else {
                // In token amount mode: keep token amount, update USD display
                const assetNumber = form.getValues("assetNumber");
                if (assetNumber !== null) {
                    const newUsdAmount = assetNumber * newTokenPrice;
                    form.setValue("usdNumber", newUsdAmount, { shouldTouch: true });
                    // Don't update assetNumber, keep the original token amount
                }
            }
        },
        [form, getTokenPrice, isUsd],
    );

    return {
        setTokenAmount,
        setUsdAmount,
        setTokenAddress,
    };
}
