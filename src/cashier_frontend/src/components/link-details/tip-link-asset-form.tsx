import { ChangeEvent, FC, useState, useEffect, useMemo } from "react";
import { SubmitHandler } from "react-hook-form";
import { IconInput } from "@/components/icon-input";
import { FixedBottomButton } from "@/components/fix-bottom-button";
import AssetButton from "@/components/asset-button";
import AssetDrawer from "@/components/asset-drawer";
import { useTranslation } from "react-i18next";
import { AssetFormSkeleton } from "./asset-form-skeleton";
import { SelectedAssetButtonInfo } from "./selected-asset-button-info";
import { UsdSwitch, convertToUsd, convertFromUsd } from "./usd-switch";
import { TipLinkAssetFormSchema } from "./tip-link-asset-form.hooks";
import { AmountActionButtons } from "./amount-action-buttons";
import { useLinkActionStore } from "@/stores/linkActionStore";
import { useTokens } from "@/hooks/useTokens";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { Label } from "../ui/label";
import { LINK_STATE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import TransactionToast from "../transaction/transaction-toast";
type TipLinkAssetFormProps = {
    onSubmit: SubmitHandler<TipLinkAssetFormSchema>;
    isButtonDisabled?: boolean;
};

const USD_AMOUNT_PRESETS = [1, 2, 5, 10];
const PERCENTAGE_AMOUNT_PRESETS = [25, 50, 75, 100];

export const TipLinkAssetForm: FC<TipLinkAssetFormProps> = ({ onSubmit, isButtonDisabled }) => {
    const { t } = useTranslation();
    const { link } = useLinkActionStore();
    const { getUserInput, updateUserInput } = useLinkCreationFormStore();

    const [showAssetDrawer, setShowAssetDrawer] = useState<boolean>(false);
    const [isUsd, setIsUsd] = useState<boolean>(false);
    // Separate input value state - completely controlled by the user when editing
    const [displayValue, setDisplayValue] = useState<string>("");
    // Flag to track if input has been touched
    const [inputTouched, setInputTouched] = useState<boolean>(false);
    const { showToast, toastData, hideToast } = useToast();

    const { filteredTokenList, isLoading, getToken, isLoadingPrices, getTokenPrice } = useTokens();

    // Get current input from store
    const currentInput = link?.id ? getUserInput(link.id) : undefined;
    const currentAsset = currentInput && currentInput.assets ? currentInput.assets[0] : undefined;

    // Get selected token from address
    const token = currentAsset?.address ? getToken(currentAsset.address) : undefined;
    const tokenUsdPrice = token?.address ? getTokenPrice(token.address) : undefined;
    const canConvert = tokenUsdPrice !== undefined;

    // Calculate the actual token amount for display and conversion
    const tokenAmount = useMemo(() => {
        if (!currentAsset?.amount || !token) return 0;
        const decimals = token.decimals || 8;
        return Number(currentAsset.amount) / 10 ** decimals;
    }, [currentAsset?.amount, token]);

    // Initialize with first token if no token is selected
    useEffect(() => {
        if (!link?.id || filteredTokenList?.length === 0) return;
        console.log("🚀 Link (tip-link-asset-form): ", link);
        // Check if we already have an asset selected
        if (currentInput && currentInput.assets && currentInput?.assets[0]?.address) {
            // Do nothing, already initialized
        } else {
            // Initialize with the first token in the list
            updateUserInput(link.id, {
                assets: [
                    {
                        address: filteredTokenList?.[0]?.address,
                        amount: BigInt(0),
                        totalClaim: BigInt(0),
                        usdEquivalent: 0,
                        usdConversionRate: filteredTokenList?.[0]?.usdConversionRate ?? 0,
                    },
                ],
            });
        }
    }, [link?.id, filteredTokenList]);

    // Initialize display value when asset/token changes or when USD mode toggles
    // But ONLY if the user hasn't touched the input
    useEffect(() => {
        // Skip updating if the user has touched the input
        if (inputTouched) return;

        if (tokenAmount > 0 && token) {
            if (isUsd && tokenUsdPrice) {
                // In USD mode, display the USD equivalent
                const usdAmount = convertToUsd(tokenAmount, tokenUsdPrice);
                setDisplayValue(usdAmount.toFixed(2));
            } else {
                // In token mode, display the token amount
                setDisplayValue(tokenAmount.toString());
            }
        } else {
            setDisplayValue("");
        }
    }, [tokenAmount, token, isUsd, tokenUsdPrice, inputTouched]);

    // Automatically disable USD mode if there's no price for the current token
    useEffect(() => {
        if (isUsd && !canConvert) {
            setIsUsd(false);
        }
    }, [canConvert, isUsd]);

    // Handle USD toggle specifically
    const handleUsdToggle = (newIsUsd: boolean) => {
        if (canConvert) {
            setIsUsd(newIsUsd);
            // Always update display value on toggle
            setInputTouched(false); // Reset touched state to allow update

            if (tokenAmount > 0 && tokenUsdPrice) {
                if (newIsUsd) {
                    // Switching to USD mode - show USD amount
                    const usdAmount = convertToUsd(tokenAmount, tokenUsdPrice);
                    setDisplayValue(usdAmount.toFixed(2));
                } else {
                    // Switching to token mode - show token amount
                    setDisplayValue(tokenAmount.toString());
                }
            }
        }
    };

    // Helper function to update asset amount in store
    const updateAssetAmount = (amount: bigint) => {
        const currentInput = link?.id ? getUserInput(link.id) : undefined;
        if (link && currentInput) {
            const currentAssets = currentInput.assets || [];
            if (currentAssets.length > 0) {
                currentAssets[0] = {
                    ...currentAssets[0],
                    amount,
                };
                updateUserInput(link.id, {
                    assets: currentAssets,
                });
            }
        }
    };

    // Function to create preset buttons based on the current mode
    const presetButtons = useMemo(() => {
        console.log("Calling get preset buttons");
        if (isUsd && canConvert) {
            return USD_AMOUNT_PRESETS.map((amount) => ({
                content: `${amount} USD`,
                action: () => {
                    if (token && tokenUsdPrice) {
                        const tokenAmount = convertFromUsd(amount, tokenUsdPrice);
                        const decimals = token.decimals || 8;
                        const valueBN = BigInt(Math.floor(tokenAmount * 10 ** decimals));
                        updateAssetAmount(valueBN);
                        // Update display directly to match the selected preset
                        setDisplayValue(amount.toString());
                    }
                },
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
                        if (availableAmount !== undefined && token) {
                            const amount = availableAmount * factor;
                            const decimals = token.decimals || 8;
                            const valueBN = BigInt(Math.floor(amount * 10 ** decimals));
                            updateAssetAmount(valueBN);
                            // Update display directly to match the selected preset
                            setDisplayValue(amount.toString());
                        }
                    },
                };
            });
        }
    }, [isUsd, canConvert, token, tokenUsdPrice, updateAssetAmount]);

    // Update the display value and the actual token amount on each keystroke
    const handleAmountInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setInputTouched(true);
        setDisplayValue(value);

        // Also update the actual token amount immediately
        if (!token) return;

        if (value && !isNaN(parseFloat(value))) {
            const decimals = token.decimals || 8;
            try {
                if (isUsd && tokenUsdPrice) {
                    // When in USD mode, convert USD amount to token amount
                    const usdAmount = parseFloat(value);
                    const tokenAmount = convertFromUsd(usdAmount, tokenUsdPrice);
                    const valueBN = BigInt(Math.floor(tokenAmount * 10 ** decimals));
                    updateAssetAmount(valueBN);
                } else {
                    // Regular token amount handling
                    const tokenAmount = parseFloat(value);
                    const valueBN = BigInt(Math.floor(tokenAmount * 10 ** decimals));
                    updateAssetAmount(valueBN);
                }
            } catch (e) {
                // Handle potential BigInt conversion errors
                console.error("Error converting to BigInt:", e);
                updateAssetAmount(BigInt(0));
            }
        } else {
            updateAssetAmount(BigInt(0));
        }
    };

    // No need for separate blur handler since we update on change
    const handleInputBlur = () => {
        // Just reset the touched state
        setTimeout(() => setInputTouched(false), 100);
    };

    // Apply the preset amount immediately and update display
    const handlePresetClick = (action: () => void) => {
        // Set inputTouched to false so the preset action updates are not interfered with
        setInputTouched(false);
        // Execute the preset action that updates the amount
        action();
    };

    const handleSetTokenAddress = (address: string) => {
        const newToken = getToken(address);
        const currentInput = link?.id ? getUserInput(link.id) : undefined;

        if (currentInput && newToken && link) {
            // Get current value
            let newAmount = BigInt(0);

            // If we're in USD mode and have a valid displayValue, preserve the USD amount
            if (isUsd && tokenUsdPrice && displayValue && !isNaN(parseFloat(displayValue))) {
                const usdAmount = parseFloat(displayValue);

                // Get new token's price to convert USD to the proper token amount
                const newTokenPrice = getTokenPrice(newToken.address);

                if (newTokenPrice) {
                    // Convert USD to new token amount using utility function
                    const newTokenAmount = convertFromUsd(usdAmount, newTokenPrice);
                    const decimals = newToken.decimals;
                    newAmount = BigInt(Math.floor(newTokenAmount * 10 ** decimals));
                }
            }
            // If we're in token mode or can't convert, keep the original amount
            else if (currentInput.assets?.[0]?.amount) {
                newAmount = currentInput.assets[0].amount;
            }

            // Update asset with new address and calculated amount
            updateUserInput(link.id, {
                assets: [
                    {
                        address,
                        amount: newAmount,
                        totalClaim: BigInt(0),
                        usdEquivalent: 0,
                        usdConversionRate: newToken?.usdConversionRate ?? 0,
                    },
                ],
            });
        }

        setShowAssetDrawer(false);
        setInputTouched(false); // Reset touched state when changing token
    };

    const getAmountInputCurrencySymbol = () => {
        return isUsd ? "USD" : (token?.name ?? "");
    };

    return (
        <div className="w-full h-full flex flex-col flex-grow relative">
            {isLoading || !currentAsset?.address ? (
                <AssetFormSkeleton />
            ) : (
                <>
                    <div className="flex flex-col h-full">
                        <div className="input-label-field-container mt-4">
                            <Label>{t("create.asset")}</Label>
                            <AssetButton
                                handleClick={() => setShowAssetDrawer(true)}
                                text="Choose Asset"
                                childrenNode={<SelectedAssetButtonInfo selectedToken={token} />}
                            />
                        </div>

                        <div className="input-label-field-container mt-4">
                            <div className="flex justify-between items-center">
                                <Label>{t("create.amount")}</Label>
                                {token && (
                                    <UsdSwitch
                                        token={token}
                                        amount={tokenAmount}
                                        symbol={token?.name ?? ""}
                                        isUsd={isUsd}
                                        onToggle={handleUsdToggle}
                                        canConvert={canConvert}
                                        tokenDecimals={8}
                                        usdDecimals={2}
                                    />
                                )}
                            </div>
                            <IconInput
                                type="number"
                                step="any"
                                isCurrencyInput={true}
                                currencySymbol={getAmountInputCurrencySymbol()}
                                value={displayValue}
                                onChange={handleAmountInputChange}
                                onBlur={handleInputBlur}
                            />
                            {!isLoadingPrices && token && (
                                <AmountActionButtons
                                    data={presetButtons.map((button) => ({
                                        content: button.content,
                                        action: () => handlePresetClick(button.action),
                                    }))}
                                    isDisabled={token.amount == 0n}
                                />
                            )}
                        </div>

                        <div className="flex-grow mt-auto flex items-end">
                            <FixedBottomButton
                                type="submit"
                                variant="default"
                                size="lg"
                                className="w-full"
                                onClick={(e) => {
                                    e.preventDefault();

                                    // Validate if needed
                                    const asset = filteredTokenList?.find(
                                        (asset) => asset.address === currentAsset?.address,
                                    );

                                    if (currentAsset && currentAsset.amount === BigInt(0)) {
                                        showToast(
                                            t("create.amount_error"),
                                            t("create.amount_error_message"),
                                            "error",
                                        );
                                    }

                                    console.log("Asset amount:", Number(asset?.amount));
                                    console.log(
                                        "Current asset amount:",
                                        Number(currentAsset.amount),
                                    );

                                    const hasEnoughBalance =
                                        asset &&
                                        asset.amount !== null &&
                                        typeof asset.amount !== "undefined" &&
                                        Number(currentAsset.amount) <= Number(asset.amount);

                                    console.log("Has enough balance:", hasEnoughBalance);

                                    if (!hasEnoughBalance) {
                                        showToast("Error", "Insufficient balance", "error");
                                        return;
                                    }
                                    if (link && currentAsset && currentAsset.amount > BigInt(0)) {
                                        updateUserInput(link.id, {
                                            state: LINK_STATE.CREATE_LINK,
                                        });

                                        onSubmit({
                                            tokenAddress: currentAsset.address,
                                            assetNumber: Number(displayValue),
                                            usdNumber: isUsd ? Number(displayValue) : null,
                                            amount: currentAsset.amount,
                                        });
                                    }
                                }}
                                disabled={
                                    isButtonDisabled ||
                                    !currentAsset ||
                                    currentAsset.amount <= BigInt(0)
                                }
                            >
                                {t("continue")}
                            </FixedBottomButton>
                        </div>
                    </div>

                    <AssetDrawer
                        title="Select Asset"
                        open={showAssetDrawer}
                        handleClose={() => setShowAssetDrawer(false)}
                        handleChange={handleSetTokenAddress}
                        assetList={filteredTokenList ?? []}
                    />

                    <TransactionToast
                        open={toastData?.open ?? false}
                        onOpenChange={hideToast}
                        title={toastData?.title ?? ""}
                        description={toastData?.description ?? ""}
                        variant={toastData?.variant ?? "default"}
                        duration={3000}
                    />
                </>
            )}
        </div>
    );
};
