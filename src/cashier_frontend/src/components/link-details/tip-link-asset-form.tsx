import { ChangeEvent, FC, useState, useMemo, useEffect } from "react";
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
import { TipLinkAssetFormSchema, useFormActions } from "./tip-link-asset-form.hooks";
import { useTipLinkAssetForm } from "./tip-link-asset-form.hooks";
import { AmountActionButtons } from "./amount-action-buttons";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { useTokens } from "@/hooks/useTokens";
type TipLinkAssetFormProps = {
    onSubmit: SubmitHandler<TipLinkAssetFormSchema>;
    isButtonDisabled?: boolean;
};

const USD_AMOUNT_PRESETS = [1, 2, 5, 10];
const PERCENTAGE_AMOUNT_PRESETS = [25, 50, 75, 100];

export const TipLinkAssetForm: FC<TipLinkAssetFormProps> = ({ onSubmit, isButtonDisabled }) => {
    const { t } = useTranslation();
    const { link } = useLinkActionStore();

    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);
    const [isUsd, setIsUsd] = useState<boolean>(false);
    const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(
        link?.asset_info[0]?.address,
    );

    const { filteredTokenList, isLoading, getToken, isLoadingPrices, getTokenPrice } = useTokens();

    // Get existing token from link state or maintain the selected one
    const token = useMemo(() => {
        console.log("useMemo ");
        // First priority: currently selected token address (from state)
        if (selectedTokenAddress) {
            const currentToken = getToken(selectedTokenAddress);
            if (currentToken) return currentToken;
        }

        // Second priority: link asset info
        if (link?.asset_info[0]?.address) {
            return getToken(link.asset_info[0].address);
        }

        // Last resort: first token in the list
        return filteredTokenList && filteredTokenList.length > 0 ? filteredTokenList[0] : null;
    }, [filteredTokenList]);

    const form = useTipLinkAssetForm(filteredTokenList ?? [], {
        tokenAddress: token?.address,
        assetNumber: 0,
        usdNumber: null,
        amount: BigInt(0),
    });

    const { setUsdAmount, setTokenAmount, setTokenAddress } = useFormActions(form, isUsd);

    // Update the selected token address when it changes in the form
    useEffect(() => {
        const formTokenAddress = form.getValues("tokenAddress");
        if (formTokenAddress && formTokenAddress !== selectedTokenAddress) {
            setSelectedTokenAddress(formTokenAddress);
        }
    }, [form, selectedTokenAddress]);

    const tokenUsdPrice = getTokenPrice(token?.address || "");
    const canConvert = tokenUsdPrice !== undefined;

    // Automatically disable USD mode if there's no price for the current token
    useEffect(() => {
        if (isUsd && !canConvert) {
            setIsUsd(false);
        }
    }, [canConvert, isUsd]);

    // Only set token address when token changes, don't touch the token amount
    useEffect(() => {
        if (token) {
            setTokenAddress(token.address);
        }
    }, [token, setTokenAddress]);

    // Function to create preset buttons based on the current mode
    const getPresetButtons = () => {
        if (isUsd && canConvert) {
            return USD_AMOUNT_PRESETS.map((amount) => ({
                content: `${amount} USD`,
                action: () => setUsdAmount(amount),
            }));
        } else {
            return PERCENTAGE_AMOUNT_PRESETS.map((percentage) => {
                const availableAmount = token?.amount
                    ? Number(token.amount) / 10 ** (token.decimals || 8)
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
            });
        }
    };

    const handleAmountInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (isUsd) {
            setUsdAmount(value);
        } else {
            setTokenAmount(value);
        }
    };

    const handleSetTokenAddress = (address: string) => {
        // Only update if address is different to prevent unnecessary resets
        if (address !== form.getValues("tokenAddress")) {
            setTokenAddress(address);
            setSelectedTokenAddress(address);
        }
        setShowAssetDrawer(false);
    };

    const getAmountInputValue = () => {
        return isUsd ? (form.getValues("usdNumber") ?? "") : (form.getValues("assetNumber") ?? "");
    };

    const getAmountInputCurrencySymbol = () => {
        return isUsd ? "USD" : (token?.name ?? "");
    };

    const getCurrencySwitchTokenAmount = () => {
        return canConvert ? form.getValues("assetNumber") : undefined;
    };

    const getCurrencySwitchUsdAmount = () => {
        return canConvert ? form.getValues("usdNumber") : undefined;
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
                                console.log("Submitted with data: ", data);
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
                                                <SelectedAssetButtonInfo selectedToken={token} />
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
                                                symbol={token?.name ?? ""}
                                                isUsd={isUsd}
                                                onToggle={(value) => canConvert && setIsUsd(value)}
                                                canConvert={canConvert}
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
                                                className="pl-3 py-5 text-md rounded-lg appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-xs border border-input"
                                            />
                                        </FormControl>

                                        {!isLoadingPrices && (
                                            <AmountActionButtons data={getPresetButtons()} />
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
                                    onClick={(e) => {
                                        // Prevent default to handle our own validation
                                        e.preventDefault();

                                        // Check token balance validation
                                        const asset = filteredTokenList?.find(
                                            (asset) =>
                                                asset.address === form.getValues("tokenAddress"),
                                        );

                                        // Manually check validation conditions
                                        const assetNumber = form.getValues("assetNumber");
                                        const hasEnoughBalance =
                                            asset &&
                                            assetNumber !== null &&
                                            typeof asset.amount !== "undefined" &&
                                            assetNumber <=
                                                Number(asset.amount) / 10 ** (asset.decimals || 8);

                                        console.log("Has enough balance:", hasEnoughBalance);

                                        if (!hasEnoughBalance) {
                                            form.setError("assetNumber", {
                                                type: "manual",
                                                message: "Insufficient balance",
                                            });
                                            return;
                                        }

                                        // If validation passes, trigger form submission
                                        form.handleSubmit((data) => {
                                            console.log("Submitted with data: ", data);
                                            onSubmit(data);
                                        })();
                                    }}
                                    disabled={isButtonDisabled || !form.formState.isValid}
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
                    />
                </>
            )}
        </div>
    );
};
