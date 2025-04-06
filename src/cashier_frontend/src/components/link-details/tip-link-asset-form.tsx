import { ChangeEvent, FC, useState } from "react";
import { SubmitHandler } from "react-hook-form";
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
    TipLinkAssetFormSchema,
    useFormActions,
} from "./tip-link-asset-form.hooks";
import { useTipLinkAssetForm } from "./tip-link-asset-form.hooks";
import { AmountActionButtons } from "./amount-action-buttons";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { useCreateLinkStore } from "@/stores/createLinkStore";
import { useTokens } from "@/hooks/useTokens";

type TipLinkAssetFormProps = {
    onSubmit: SubmitHandler<TipLinkAssetFormSchema>;
    isButtonDisabled?: boolean;
};

const USD_AMOUNT_PRESETS = [1, 2, 5, 10];
const PERCENTAGE_AMOUNT_PRESETS = [25, 50, 75, 100];

export const TipLinkAssetForm: FC<TipLinkAssetFormProps> = ({ onSubmit, isButtonDisabled }) => {
    const { t } = useTranslation();
    const { link } = useCreateLinkStore();

    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);
    const [isUsd, setIsUsd] = useState<boolean>(false);

    const { filteredTokenList, isLoading, isLoadingBalances, getToken } = useTokens();

    const token = link?.asset_info[0]?.address ? getToken(link?.asset_info[0]?.address) : null;

    // Initialize form with values from link state if they exist
    const defaultValues = {
        tokenAddress: link?.asset_info[0]?.address ?? "",
        amount: link?.asset_info[0]?.amount ?? BigInt(0),
        assetNumber:
            token && link?.asset_info[0].amount
                ? TokenUtilService.getHumanReadableAmountFromToken(
                      link?.asset_info[0].amount,
                      token,
                  )
                : null,
        usdNumber: null,
    };

    const form = useTipLinkAssetForm(filteredTokenList ?? [], defaultValues);

    const selectedAsset = useSelectedAsset(filteredTokenList, form);
    const { setUsdAmount, setTokenAmount, setTokenAddress } = useFormActions(form);

    const { data: rates, isFetching: isFetchingConversionRates } = useConversionRatesQuery(
        selectedAsset?.address,
    );

    const createUsdAmountPresetData = (amount: number) => {
        return {
            content: `${amount} USD`,
            action: () => setUsdAmount(amount),
        };
    };

    const createPercentageAmountPresetData = (percentage: number) => {
        // Update to work with the toke en amount from FungibleToken
        const availableAmount = selectedAsset?.amount
            ? Number(selectedAsset.amount) / 10 ** (selectedAsset.decimals || 8)
            : undefined;
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
        <div className="w-full h-full flex flex-col flex-grow relative">
            {isLoading ? (
                <AssetFormSkeleton />
            ) : (
                <>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit((data) => {
                                onSubmit(data);
                            })}
                            className="space-y-8 flex flex-col h-full"
                        >
                            <FormField
                                name="tokenAddress"
                                control={form.control}
                                render={() => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-2">
                                            <FormLabel>{t("create.asset")}</FormLabel>
                                        </div>
                                        <AssetButton
                                            handleClick={() => setShowAssetDrawer(true)}
                                            text="Choose Asset"
                                            childrenNode={
                                                <SelectedAssetButtonInfo
                                                    selectedToken={selectedAsset}
                                                    isLoadingBalance={isLoadingBalances}
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
                                            <div className="flex gap-2 items-center justify-between mb-2">
                                                <FormLabel>{t("create.amount")}</FormLabel>
                                            </div>
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
                                                disabled={isLoadingBalances}
                                                className="pl-3 py-5 text-md rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
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

                            <div className="flex-grow mt-auto flex items-end">
                                <FixedBottomButton
                                    type="submit"
                                    variant="default"
                                    size="lg"
                                    className="w-full"
                                    onClick={() => console.log(form.formState.errors)}
                                    disabled={isButtonDisabled}
                                >
                                    {t("continue")}
                                </FixedBottomButton>
                            </div>
                        </form>
                    </Form>

                    <AssetDrawer
                        title="Select Asset"
                        open={showAssetDrawer}
                        handleClose={() => setShowAssetDrawer(false)}
                        handleChange={handleSetTokenAddress}
                        assetList={filteredTokenList ?? []}
                        isLoadingBalance={isLoadingBalances}
                    />
                </>
            )}
        </div>
    );
};
