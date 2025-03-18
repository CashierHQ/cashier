import { ChangeEvent, FC, useState } from "react";
import { DefaultValues, SubmitHandler } from "react-hook-form";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { IconInput } from "@/components/icon-input";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import AssetButton from "@/components/asset-button";
import AssetDrawer from "@/components/asset-drawer";
import { useTranslation } from "react-i18next";
import { AssetFormSkeleton } from "./asset-form-skeleton";
import { SelectedAssetButtonInfo } from "./selected-asset-button-info";
import { UsdSwitch } from "./usd-switch";
import {
    useSelectedAsset,
    useUserAssets,
    TipLinkAssetFormSchema,
    useFormActions,
} from "./tip-link-asset-form.hooks";
import { useTipLinkAssetForm } from "./tip-link-asset-form.hooks";
import { AmountActionButtons } from "./amount-action-buttons";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { useTokenMetadataList } from "@/hooks/useTokenMetadataQuery";
import { TokenUtilService } from "@/services/tokenUtils.service";

type TipLinkAssetFormProps = {
    defaultValues?: DefaultValues<TipLinkAssetFormSchema>;
    onSubmit: SubmitHandler<TipLinkAssetFormSchema>;
    isButtonDisabled?: boolean;
};

const USD_AMOUNT_PRESETS = [1, 2, 5, 10];
const PERCENTAGE_AMOUNT_PRESETS = [25, 50, 75, 100];

export const TipLinkAssetForm: FC<TipLinkAssetFormProps> = ({
    onSubmit,
    defaultValues,
    isButtonDisabled,
}) => {
    const { t } = useTranslation();
    const { data: metadataList } = useTokenMetadataList();

    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);
    const [isUsd, setIsUsd] = useState<boolean>(false);

    const { isLoadingAssets, isLoadingBalance, assets } = useUserAssets();

    const form = useTipLinkAssetForm(assets ?? [], {
        tokenAddress: defaultValues?.tokenAddress ?? "",
        amount: defaultValues?.amount ?? BigInt(0),
        assetNumber: TokenUtilService.getHumanReadableAmountFromMetadata(
            defaultValues?.amount ?? BigInt(0),
            metadataList?.find((metadata) => metadata.canisterId === defaultValues?.tokenAddress)
                ?.metadata,
        ),
        usdNumber: null,
    });

    const selectedAsset = useSelectedAsset(assets, form);
    const { setUsdAmount, setTokenAmount, setTokenAddress } = useFormActions(form);

    const { data: rates, isFetching: isFetchingConversionRates } = useConversionRatesQuery(
        selectedAsset?.tokenAddress,
    );

    const createUsdAmountPresetData = (amount: number) => {
        return {
            content: `${amount} USD`,
            action: () => setUsdAmount(amount),
        };
    };

    const createPercentageAmountPresetData = (percentage: number) => {
        const availableAmount = selectedAsset?.amount;
        const factor = percentage / 100;

        return {
            content: `${percentage} %`,
            action: () => {
                if (availableAmount === undefined) {
                    setTokenAmount(0);
                } else {
                    setTokenAmount(availableAmount * factor);
                }
            },
        };
    };

    const handleAmountInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const action = isUsd ? setUsdAmount : setTokenAmount;

        action(value);
    };

    const handleSetTokenAddress = (address: string) => {
        setTokenAddress(address);
        setShowAssetDrawer(false);
        setIsUsd(false);
    };

    const getAmountInputValue = () => {
        const usdValue = form.getValues("usdNumber");
        const tokenValue = form.getValues("assetNumber");
        const value = isUsd ? usdValue : tokenValue;

        return value ?? "";
    };

    const getAmountInputCurrencySymbol = () => {
        const symbol = isUsd ? "USD" : selectedAsset?.name;

        return symbol ?? "";
    };

    const getCurrencySwitchTokenAmount = () => {
        if (!rates || !rates.canConvert) return undefined;

        return form.getValues("assetNumber") ?? undefined;
    };

    const getCurrencySwitchUsdAmount = () => {
        if (!rates || !rates.canConvert) return undefined;

        return form.getValues("usdNumber") ?? undefined;
    };

    return (
        <div className="w-full">
            {isLoadingAssets ? (
                <AssetFormSkeleton />
            ) : (
                <>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit((data) => {
                                onSubmit(data);
                            })}
                            className="space-y-8 mb-[100px]"
                        >
                            <FormField
                                name="tokenAddress"
                                control={form.control}
                                render={() => (
                                    <FormItem>
                                        <FormLabel>{t("create.asset")}</FormLabel>
                                        <AssetButton
                                            handleClick={() => setShowAssetDrawer(true)}
                                            text="Choose Asset"
                                            childrenNode={
                                                <SelectedAssetButtonInfo
                                                    selectedToken={selectedAsset}
                                                    isLoadingBalance={isLoadingBalance}
                                                />
                                            }
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name={isUsd ? "usdNumber" : "assetNumber"}
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center">
                                            <FormLabel>{t("create.amount")}</FormLabel>
                                            <UsdSwitch
                                                amount={getCurrencySwitchTokenAmount()}
                                                amountUsd={getCurrencySwitchUsdAmount()}
                                                symbol={selectedAsset?.name ?? ""}
                                                isUsd={isUsd}
                                                onToggle={setIsUsd}
                                            />
                                        </div>
                                        <FormControl>
                                            <IconInput
                                                type="number"
                                                step="any"
                                                isCurrencyInput={true}
                                                currencySymbol={getAmountInputCurrencySymbol()}
                                                {...field}
                                                value={getAmountInputValue()}
                                                onChange={handleAmountInputChange}
                                                disabled={isLoadingBalance}
                                                className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                        </FormControl>

                                        {!isFetchingConversionRates && (
                                            <>
                                                {rates?.canConvert ? (
                                                    <AmountActionButtons
                                                        data={USD_AMOUNT_PRESETS.map(
                                                            createUsdAmountPresetData,
                                                        )}
                                                    />
                                                ) : (
                                                    <AmountActionButtons
                                                        data={PERCENTAGE_AMOUNT_PRESETS.map(
                                                            createPercentageAmountPresetData,
                                                        )}
                                                    />
                                                )}
                                            </>
                                        )}

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FixedBottomButton
                                type="submit"
                                variant="default"
                                size="lg"
                                className="fixed bottom-[30px] left-1/2 -translate-x-1/2"
                                onClick={() => console.log(form.formState.errors)}
                                disabled={isButtonDisabled}
                            >
                                {t("continue")}
                            </FixedBottomButton>
                        </form>
                    </Form>

                    <AssetDrawer
                        title="Select Asset"
                        open={showAssetDrawer}
                        handleClose={() => setShowAssetDrawer(false)}
                        handleChange={handleSetTokenAddress}
                        assetList={assets ?? []}
                        isLoadingBalance={isLoadingBalance}
                    />
                </>
            )}
        </div>
    );
};
