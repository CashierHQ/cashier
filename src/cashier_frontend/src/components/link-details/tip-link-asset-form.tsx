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
import { TipLinkAssetFormSchema } from "./tip-link-asset-form.hooks";
import { useTipLinkAssetForm } from "./tip-link-asset-form.hooks";
import { AmountActionButtons } from "./amount-action-buttons";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { useTokens } from "@/hooks/useTokens";
import { FungibleToken } from "@/types/fungible-token.speculative";
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

    const { filteredTokenList, isLoading, getToken, isLoadingPrices, getTokenPrice } = useTokens();

    const form = useTipLinkAssetForm(filteredTokenList ?? [], {
        tokenAddress: undefined,
        assetNumber: 0,
        usdNumber: null,
        amount: BigInt(0),
    });

    const [token, setToken] = useState<FungibleToken | undefined>(undefined);

    useEffect(() => {
        if (link?.asset_info[0]?.address) {
            setToken(getToken(link.asset_info[0].address));
        } else {
            console.log("🚀 ~ useEffect ~ link:", link);
            console.log("Updating with values: ", {
                tokenAddress: filteredTokenList?.[0]?.address,
                assetNumber: form.getValues("assetNumber"),
                usdNumber: form.getValues("usdNumber"),
                amount: form.getValues("amount"),
            });
            setToken(filteredTokenList?.[0]);
        }
    }, []);

    useEffect(() => {
        console.log("useEffect link: ", link);
    }, [link]);
    // Handle initial token selection and updates
    useEffect(() => {
        if (!token?.address) return;

        form.setValue("tokenAddress", token.address);
        console.log("Setting token address: ", token.address);
    }, [token, form]);

    const tokenUsdPrice = getTokenPrice(token?.address || "");
    const canConvert = tokenUsdPrice !== undefined;

    // Automatically disable USD mode if there's no price for the current token
    useEffect(() => {
        if (isUsd && !canConvert) {
            setIsUsd(false);
        }
    }, [canConvert, isUsd]);

    // Function to create preset buttons based on the current mode
    const getPresetButtons = () => {
        if (isUsd && canConvert) {
            return USD_AMOUNT_PRESETS.map((amount) => ({
                content: `${amount} USD`,
                action: () => form.setValue("usdNumber", amount),
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
                            form.setValue("assetNumber", 0);
                        } else {
                            form.setValue("assetNumber", availableAmount * factor);
                        }
                    },
                };
            });
        }
    };

    const handleAmountInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (isUsd) {
            form.setValue("usdNumber", parseFloat(value));
        } else {
            form.setValue("assetNumber", parseFloat(value));
        }
    };

    const handleSetTokenAddress = (address: string) => {
        // Only update if address is different to prevent unnecessary resets
        if (address !== form.getValues("tokenAddress")) {
            console.log("Setting token address: ", address);
            setToken(getToken(address));
            form.setValue("tokenAddress", address);
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
