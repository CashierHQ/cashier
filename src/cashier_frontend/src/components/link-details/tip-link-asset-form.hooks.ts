import useTokenMetadataQuery from "@/hooks/useTokenMetadataQuery";
import { ConversionRates, UsdConversionService } from "@/services/usdConversion.service";
import { convertTokenAmountToNumber } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@nfid/identitykit/react";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import CanisterUtilsService from "@/services/canisterUtils.service";
import { useEffect, useMemo, useState } from "react";
import { AssetSelectItem } from "@/components/asset-select";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { mapAPITokenModelToAssetSelectModel } from "@/services/icExplorer.service";
import { useIdentity } from "@nfid/identitykit/react";
import * as z from "zod";
import { TokenProviderService } from "@/services/tokenProvider";

export const tipLinkAssetFormSchema = (assets: AssetSelectItem[]) => {
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
        })
        .superRefine((val, ctx) => {
            if (val.usdNumber === null) {
                ctx.addIssue({
                    code: "custom",
                    message: "Must input number",
                    path: ["usdNumber"],
                });
            }

            if (val.assetNumber === null) {
                ctx.addIssue({
                    code: "custom",
                    message: "Must input number",
                    path: ["assetNumber"],
                });
            }

            const asset = assets.find((asset) => asset.tokenAddress === val.tokenAddress);

            if (!asset || val.assetNumber === null || val.assetNumber > asset.amount) {
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

export type TipLinkAssetFormSchema = z.infer<ReturnType<typeof tipLinkAssetFormSchema>>;

export function useTipLinkAssetForm(
    assets: AssetSelectItem[],
    defaultValues?: DefaultValues<TipLinkAssetFormSchema>,
): UseFormReturn<TipLinkAssetFormSchema> {
    const form = useForm<TipLinkAssetFormSchema>({
        resolver: zodResolver(tipLinkAssetFormSchema(assets)),
        defaultValues: defaultValues,
    });

    const assetNumber = form.watch("assetNumber");
    const tokenAddress = form.watch("tokenAddress");

    const { data } = useTokenMetadataQuery(tokenAddress);

    // update amount after assetNumber change
    useEffect(() => {
        if (assetNumber && data) {
            const decimals = data?.metadata.decimals;

            form.setValue("amount", BigInt(convertTokenAmountToNumber(assetNumber, decimals)));
        }
    }, [assetNumber, data]);

    return form;
}

export function useHandleSetAmount(form: UseFormReturn<TipLinkAssetFormSchema>) {
    const conversionRates = useUsdConversionRates(form.getValues("tokenAddress"));

    const handleSetAmount = (isUsd: boolean, value: string) => {
        const parsedValue = parseFloat(value);
        const factor = isUsd ? conversionRates.usdToToken : conversionRates.tokenToUsd;
        const primary = isUsd ? "usdNumber" : "assetNumber";
        const secondary = isUsd ? "assetNumber" : "usdNumber";

        if (isNaN(parsedValue)) {
            form.setValue(primary, null);
            form.setValue(secondary, null);
        } else {
            form.setValue(primary, parsedValue);
            form.setValue(secondary, factor ? parsedValue * factor : null);
        }
    };

    return handleSetAmount;
}

export function useHandleSetTokenAddress(
    form: UseFormReturn<TipLinkAssetFormSchema>,
    then: () => void,
) {
    const walletAddress = useWalletAddress();

    const handleSetTokenAddress = (isUsd: boolean, value: string) => {
        UsdConversionService.getConversionRates(walletAddress, value).then((conversionRates) => {
            form.setValue("tokenAddress", value);
            form.clearErrors("amount");
            form.clearErrors("assetNumber");
            form.clearErrors("usdNumber");

            const factor = isUsd ? conversionRates.usdToToken : conversionRates.tokenToUsd;
            const primary = isUsd ? "usdNumber" : "assetNumber";
            const secondary = isUsd ? "assetNumber" : "usdNumber";

            const primaryValue = form.getValues(primary);
            form.setValue(secondary, factor && primaryValue ? primaryValue * factor : null);

            then();
        });
    };

    return handleSetTokenAddress;
}

export function useUsdConversionRates(asset: string | undefined) {
    const walletAddress = useWalletAddress();

    const [rates, setRates] = useState<ConversionRates>({
        usdToToken: undefined,
        tokenToUsd: undefined,
    });

    useEffect(() => {
        UsdConversionService.getConversionRates(walletAddress, asset ?? "").then(setRates);
    }, [walletAddress, asset]);

    return rates;
}

export function useAssets() {
    const identity = useIdentity();
    const walletAddress = useWalletAddress();

    const [isLoadingAssets, setIsLoadingAssets] = useState(true);
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);
    const [assets, setAssets] = useState<AssetSelectItem[]>([]);

    const fetchAssetListAmounts = async (assetList: AssetSelectItem[]) => {
        const canisterUtilService = new CanisterUtilsService(identity);

        const assetListWithAmounts = await Promise.all(
            assetList.map(async (asset) => {
                const amountFetched = await canisterUtilService.checkAccountBalance(
                    asset.tokenAddress,
                    identity?.getPrincipal().toString(),
                );

                if (amountFetched === null) {
                    return asset;
                }

                const parsedAmount = await TokenUtilService.getHumanReadableAmount(
                    amountFetched,
                    asset.tokenAddress,
                );

                return {
                    ...asset,
                    amount: parsedAmount,
                };
            }),
        );
        return assetListWithAmounts;
    };

    // Fetch current user assets
    useEffect(() => {
        async function fetchUserTokens() {
            if (walletAddress) {
                const tokens = await TokenProviderService.getUserTokens(walletAddress);
                const assets = tokens.map(mapAPITokenModelToAssetSelectModel);

                fetchAssetListAmounts(assets).then((assetsWithAmounts) => {
                    setIsLoadingBalance(false);
                    setAssets(assetsWithAmounts);
                });

                setAssets(assets);
                setIsLoadingAssets(false);
            }
        }

        fetchUserTokens();
    }, [walletAddress]);

    return {
        isLoadingAssets,
        isLoadingBalance,
        isLoadingUsd: false,
        assets,
    };
}

export function useSelectedAsset(
    assets: AssetSelectItem[] | undefined,
    form: UseFormReturn<TipLinkAssetFormSchema>,
) {
    const tokenAddress = form.watch("tokenAddress");
    const defaultTokenAddress = form.formState.defaultValues?.tokenAddress;

    useEffect(() => {
        if (assets && assets.length > 0) {
            form.setValue("tokenAddress", defaultTokenAddress || assets[0].tokenAddress);
        }
    }, [assets]);

    const selectedAsset = useMemo(() => {
        return assets?.find((asset) => asset.tokenAddress === tokenAddress);
    }, [assets, tokenAddress]);

    return selectedAsset;
}

export function useWalletAddress() {
    const { user } = useAuth();
    return user ? user.principal.toText() : "";
}
