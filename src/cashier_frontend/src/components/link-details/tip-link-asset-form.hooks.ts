import useTokenMetadataQuery from "@/hooks/useTokenMetadataQuery";
import { convertTokenAmountToNumber } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import CanisterUtilsService from "@/services/canisterUtils.service";
import { useCallback, useEffect, useMemo } from "react";
import { AssetSelectItem } from "@/components/asset-select";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { mapAPITokenModelToAssetSelectModel, UserToken } from "@/services/icExplorer.service";
import { useIdentity } from "@nfid/identitykit/react";
import * as z from "zod";
import { TokenProviderService } from "@/services/tokenProviderService";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { Identity } from "@dfinity/agent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ASSET_LIST } from "@/services/tokenProviderService/devTokenProvider.service";

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

    const { data: tokenData } = useTokenMetadataQuery(form.getValues("tokenAddress"));

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

const fetchAssetListAmounts = async (identity: Identity, assetList: AssetSelectItem[]) => {
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

const fetchUserTokens = async (walletAddress: string) => {
    const tokens = await TokenProviderService.getUserTokens(walletAddress);
    if (tokens.length === 0) {
        tokens.push(...(ASSET_LIST as UserToken[]));
    }
    return tokens.map(mapAPITokenModelToAssetSelectModel);
};

export function useUserAssets() {
    const identity = useIdentity();
    const walletAddress = useWalletAddress();
    const queryClient = useQueryClient();

    const { data: assets, isLoading: isLoadingAssets } = useQuery({
        queryKey: ["userTokens", walletAddress],
        queryFn: () => fetchUserTokens(walletAddress),
        enabled: !!walletAddress,
    });

    const { data: assetListWithAmounts, isLoading: isLoadingBalance } = useQuery({
        queryKey: ["assetListAmounts", assets],
        queryFn: () =>
            identity ? fetchAssetListAmounts(identity, assets || []) : Promise.resolve([]),
        enabled: !!assets,
    });

    useEffect(() => {
        if (walletAddress) {
            queryClient.invalidateQueries({ queryKey: ["userTokens", walletAddress] });
        }
    }, [walletAddress, queryClient]);

    return {
        assets: assetListWithAmounts,
        isLoadingAssets,
        isLoadingBalance,
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
