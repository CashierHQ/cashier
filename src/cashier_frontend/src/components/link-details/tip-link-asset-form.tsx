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
import { useLinkCreationFormStore, UserInputAsset } from "@/stores/linkCreationFormStore";
import { Label } from "../ui/label";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import useToast from "@/hooks/useToast";
import TransactionToast from "../transaction/transaction-toast";
import { X, Plus, Trash } from "lucide-react";

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
    const [editingAssetIndex, setEditingAssetIndex] = useState<number>(-1);
    const [isUsdArray, setIsUsdArray] = useState<boolean[]>([false]);
    // Separate input value state - completely controlled by the user when editing
    const [displayValues, setDisplayValues] = useState<string[]>([]);
    // Flag to track if input has been touched for each asset
    const [inputTouched, setInputTouched] = useState<boolean[]>([false]);
    const { showToast, toastData, hideToast } = useToast();

    const { filteredTokenList, isLoading, getToken, isLoadingPrices, getTokenPrice } = useTokens();

    // Get current input from store
    const currentInput = link?.id ? getUserInput(link.id) : undefined;
    const currentAssets = currentInput && currentInput.assets ? currentInput.assets : [];

    // Check if we should show multiple assets interface
    const isMultiAssetType = currentInput?.linkType === LINK_TYPE.SEND_TOKEN_BASKET;

    // Initialize with first token if no token is selected
    useEffect(() => {
        if (!link?.id || filteredTokenList?.length === 0) return;
        console.log("🚀 Link (tip-link-asset-form): ", link);
        // Check if we already have an asset selected
        if (currentInput && currentInput.assets && currentInput?.assets.length > 0) {
            // Initialize displayValues and isUsdArray with the correct length
            if (displayValues.length !== currentAssets.length) {
                setDisplayValues(new Array(currentAssets.length).fill("0"));
                setIsUsdArray(new Array(currentAssets.length).fill(false));
                setInputTouched(new Array(currentAssets.length).fill(false));
            }
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
            setDisplayValues(["0"]);
            setIsUsdArray([false]);
            setInputTouched([false]);
        }
    }, [link?.id, filteredTokenList, currentAssets.length]);

    // Initialize display values for each asset when they change or USD mode toggles
    useEffect(() => {
        currentAssets.forEach((asset, index) => {
            // Skip updating if this input has been touched
            if (inputTouched[index]) return;

            const token = getToken(asset.address);
            if (!token) return;

            const decimals = token.decimals || 8;
            const tokenAmount = Number(asset.amount) / 10 ** decimals;

            if (tokenAmount > 0) {
                const tokenUsdPrice = getTokenPrice(token.address);
                if (isUsdArray[index] && tokenUsdPrice) {
                    // In USD mode, display the USD equivalent
                    const usdAmount = convertToUsd(tokenAmount, tokenUsdPrice);
                    const newDisplayValues = [...displayValues];
                    newDisplayValues[index] = usdAmount.toFixed(2);
                    setDisplayValues(newDisplayValues);
                } else {
                    // In token mode, display the token amount
                    const newDisplayValues = [...displayValues];
                    newDisplayValues[index] = tokenAmount.toString();
                    setDisplayValues(newDisplayValues);
                }
            } else {
                const newDisplayValues = [...displayValues];
                newDisplayValues[index] = "0";
                setDisplayValues(newDisplayValues);
            }
        });
    }, [currentAssets, isUsdArray, getToken, getTokenPrice, inputTouched]);

    // Helper function to update asset amount in store
    const updateAssetAmount = (index: number, amount: bigint) => {
        if (!link?.id) return;

        const currentInput = getUserInput(link.id);
        if (!currentInput) return;

        const updatedAssets = [...(currentInput.assets || [])];
        if (updatedAssets.length <= index) return;

        updatedAssets[index] = {
            ...updatedAssets[index],
            amount,
        };

        updateUserInput(link.id, {
            assets: updatedAssets,
        });
    };

    // Handle USD toggle specifically for an asset
    const handleUsdToggle = (index: number, newIsUsd: boolean) => {
        const asset = currentAssets[index];
        if (!asset) return;

        const token = getToken(asset.address);
        if (!token) return;

        const tokenUsdPrice = getTokenPrice(token.address);
        const canConvert = tokenUsdPrice !== undefined;

        if (canConvert) {
            const newIsUsdArray = [...isUsdArray];
            newIsUsdArray[index] = newIsUsd;
            setIsUsdArray(newIsUsdArray);

            // Reset touched state for this input to allow update
            const newInputTouched = [...inputTouched];
            newInputTouched[index] = false;
            setInputTouched(newInputTouched);

            const decimals = token.decimals || 8;
            const tokenAmount = Number(asset.amount) / 10 ** decimals;

            if (tokenAmount > 0 && tokenUsdPrice) {
                const newDisplayValues = [...displayValues];
                if (newIsUsd) {
                    // Switching to USD mode - show USD amount
                    const usdAmount = convertToUsd(tokenAmount, tokenUsdPrice);
                    newDisplayValues[index] = usdAmount.toFixed(2);
                } else {
                    // Switching to token mode - show token amount
                    newDisplayValues[index] = tokenAmount.toString();
                }
                setDisplayValues(newDisplayValues);
            }
        }
    };

    // Function to create preset buttons for a specific asset
    const getPresetButtons = (index: number) => {
        const asset = currentAssets[index];
        if (!asset) return [];

        const token = getToken(asset.address);
        if (!token) return [];

        const tokenUsdPrice = getTokenPrice(token.address);
        const canConvert = tokenUsdPrice !== undefined;

        if (isUsdArray[index] && canConvert) {
            return USD_AMOUNT_PRESETS.map((amount) => ({
                content: `${amount} USD`,
                action: () => {
                    if (token && tokenUsdPrice) {
                        const tokenAmount = convertFromUsd(amount, tokenUsdPrice);
                        const decimals = token.decimals || 8;
                        const valueBN = BigInt(Math.floor(tokenAmount * 10 ** decimals));
                        updateAssetAmount(index, valueBN);

                        // Update display directly
                        const newDisplayValues = [...displayValues];
                        newDisplayValues[index] = amount.toString();
                        setDisplayValues(newDisplayValues);

                        // Reset touched state
                        const newInputTouched = [...inputTouched];
                        newInputTouched[index] = false;
                        setInputTouched(newInputTouched);
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
                            updateAssetAmount(index, valueBN);

                            // Update display directly
                            const newDisplayValues = [...displayValues];
                            newDisplayValues[index] = amount.toString();
                            setDisplayValues(newDisplayValues);

                            // Reset touched state
                            const newInputTouched = [...inputTouched];
                            newInputTouched[index] = false;
                            setInputTouched(newInputTouched);
                        }
                    },
                };
            });
        }
    };

    // Update the display value and the actual token amount on each keystroke
    const handleAmountInputChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        // Update display value
        const newDisplayValues = [...displayValues];
        newDisplayValues[index] = value;
        setDisplayValues(newDisplayValues);

        // Mark this input as touched
        const newInputTouched = [...inputTouched];
        newInputTouched[index] = true;
        setInputTouched(newInputTouched);

        // Update actual token amount
        const asset = currentAssets[index];
        if (!asset) return;

        const token = getToken(asset.address);
        if (!token) return;

        if (value && !isNaN(parseFloat(value))) {
            const decimals = token.decimals || 8;
            try {
                if (isUsdArray[index]) {
                    // When in USD mode, convert USD amount to token amount
                    const tokenUsdPrice = getTokenPrice(token.address);
                    if (!tokenUsdPrice) return;

                    const usdAmount = parseFloat(value);
                    const tokenAmount = convertFromUsd(usdAmount, tokenUsdPrice);
                    const valueBN = BigInt(Math.floor(tokenAmount * 10 ** decimals));
                    updateAssetAmount(index, valueBN);
                } else {
                    // Regular token amount handling
                    const tokenAmount = parseFloat(value);
                    const valueBN = BigInt(Math.floor(tokenAmount * 10 ** decimals));
                    updateAssetAmount(index, valueBN);
                }
            } catch (e) {
                // Handle potential BigInt conversion errors
                console.error("Error converting to BigInt:", e);
                updateAssetAmount(index, BigInt(0));
            }
        } else {
            updateAssetAmount(index, BigInt(0));
        }
    };

    // Reset touched state on blur
    const handleInputBlur = (index: number) => {
        setTimeout(() => {
            const newInputTouched = [...inputTouched];
            newInputTouched[index] = false;
            setInputTouched(newInputTouched);
        }, 100);
    };

    const handleSetTokenAddress = (address: string) => {
        if (editingAssetIndex < 0 || !link?.id) return;

        const newToken = getToken(address);
        if (!newToken) return;

        const currentInput = getUserInput(link.id);
        if (!currentInput) return;

        // Update asset with new token address
        const updatedAssets = [...(currentInput.assets || [])];

        // Calculate the new amount (either 0 or converted from USD if in USD mode)
        let newAmount = BigInt(0);
        if (isUsdArray[editingAssetIndex] && displayValues[editingAssetIndex]) {
            const tokenUsdPrice = getTokenPrice(address);
            if (tokenUsdPrice && !isNaN(parseFloat(displayValues[editingAssetIndex]))) {
                const usdAmount = parseFloat(displayValues[editingAssetIndex]);
                const tokenAmount = convertFromUsd(usdAmount, tokenUsdPrice);
                const decimals = newToken.decimals || 8;
                newAmount = BigInt(Math.floor(tokenAmount * 10 ** decimals));
            }
        }

        // If we're editing an existing asset
        if (updatedAssets.length > editingAssetIndex) {
            updatedAssets[editingAssetIndex] = {
                address,
                amount: newAmount,
                totalClaim: BigInt(0),
                usdEquivalent: 0,
                usdConversionRate: newToken?.usdConversionRate ?? 0,
            };
        } else {
            // If we're adding a new asset (shouldn't happen here)
            updatedAssets.push({
                address,
                amount: newAmount,
                totalClaim: BigInt(0),
                usdEquivalent: 0,
                usdConversionRate: newToken?.usdConversionRate ?? 0,
            });
        }

        updateUserInput(link.id, { assets: updatedAssets });
        setShowAssetDrawer(false);

        // Reset touched state for this input
        const newInputTouched = [...inputTouched];
        newInputTouched[editingAssetIndex] = false;
        setInputTouched(newInputTouched);

        // Reset display value if amount is 0
        if (newAmount === BigInt(0)) {
            const newDisplayValues = [...displayValues];
            newDisplayValues[editingAssetIndex] = "0";
            setDisplayValues(newDisplayValues);
        }
    };

    const getAmountInputCurrencySymbol = (index: number) => {
        if (isUsdArray[index]) return "USD";

        const asset = currentAssets[index];
        if (!asset) return "";

        const token = getToken(asset.address);
        return token?.name ?? "";
    };

    // Add a new asset to the list
    const handleAddAnotherAsset = () => {
        if (!link?.id || !filteredTokenList || filteredTokenList.length === 0) return;

        const currentInput = getUserInput(link.id);
        if (!currentInput) return;

        const updatedAssets = [...(currentInput.assets || [])];

        // Find a token that's not already selected
        let nextTokenIndex = 0;
        if (updatedAssets.length > 0) {
            const usedAddresses = new Set(updatedAssets.map((asset) => asset.address));
            nextTokenIndex = filteredTokenList.findIndex(
                (token) => !usedAddresses.has(token.address),
            );
            if (nextTokenIndex === -1) nextTokenIndex = 0; // If all tokens are used, start from the beginning
        }

        const newAsset = {
            address: filteredTokenList[nextTokenIndex]?.address,
            amount: BigInt(0),
            totalClaim: BigInt(0),
            usdEquivalent: 0,
            usdConversionRate: filteredTokenList[nextTokenIndex]?.usdConversionRate ?? 0,
        };

        updatedAssets.push(newAsset);
        updateUserInput(link.id, { assets: updatedAssets });

        // Update state arrays
        setDisplayValues([...displayValues, "0"]);
        setIsUsdArray([...isUsdArray, false]);
        setInputTouched([...inputTouched, false]);
    };

    // Remove an asset from the list
    const handleRemoveAsset = (indexToRemove: number) => {
        if (!link?.id) return;

        const currentInput = getUserInput(link.id);
        if (!currentInput || !currentInput.assets || currentInput.assets.length <= 1) return;

        const updatedAssets = currentInput.assets.filter((_, index) => index !== indexToRemove);
        updateUserInput(link.id, { assets: updatedAssets });

        // Update state arrays
        setDisplayValues(displayValues.filter((_, index) => index !== indexToRemove));
        setIsUsdArray(isUsdArray.filter((_, index) => index !== indexToRemove));
        setInputTouched(inputTouched.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="w-full h-full flex flex-col">
            {isLoading || currentAssets.length === 0 ? (
                <AssetFormSkeleton />
            ) : (
                <>
                    <div
                        className="flex flex-col overflow-y-auto pb-20 md:overflow-visible mt-2"
                        style={{
                            maxHeight: "calc(100vh - 120px)",
                            WebkitOverflowScrolling: "touch",
                        }}
                    >
                        {/* For each asset, create a complete section with asset selector and amount input */}
                        {currentAssets.map((asset, index) => {
                            const token = getToken(asset.address);
                            const tokenUsdPrice = token?.address
                                ? getTokenPrice(token.address)
                                : undefined;
                            const canConvert = tokenUsdPrice !== undefined;

                            return (
                                <div
                                    key={index}
                                    className={`mb-6 ${currentAssets.length > 1 ? "border-b border-grey/10 pb-8 last:border-b-0" : ""}`}
                                >
                                    <div className="input-label-field-container">
                                        {/* Asset header with optional remove button */}
                                        <div className="flex justify-between items-center">
                                            <Label>
                                                {index === 0
                                                    ? t("create.asset")
                                                    : `${t("create.asset")}`}
                                            </Label>
                                            {isMultiAssetType && currentAssets.length > 1 && (
                                                <button
                                                    className="text-destructive hover:bg-destructive/10 rounded-full p-1"
                                                    onClick={() => handleRemoveAsset(index)}
                                                >
                                                    <Trash size={19} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Asset selector */}
                                        <div className="mb-4">
                                            <AssetButton
                                                handleClick={() => {
                                                    setEditingAssetIndex(index);
                                                    setShowAssetDrawer(true);
                                                }}
                                                text="Choose Asset"
                                                childrenNode={
                                                    <SelectedAssetButtonInfo
                                                        selectedToken={token}
                                                    />
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Amount input section */}
                                    <div className="input-label-field-container">
                                        <div className="flex justify-between items-center">
                                            <Label>{t("create.amount")}</Label>
                                            {token && (
                                                <UsdSwitch
                                                    token={token}
                                                    amount={
                                                        Number(asset.amount) /
                                                        10 ** (token.decimals || 8)
                                                    }
                                                    symbol={token?.name ?? ""}
                                                    isUsd={isUsdArray[index]}
                                                    onToggle={(value) =>
                                                        handleUsdToggle(index, value)
                                                    }
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
                                            currencySymbol={getAmountInputCurrencySymbol(index)}
                                            value={displayValues[index] || ""}
                                            onChange={(e) => handleAmountInputChange(index, e)}
                                            onBlur={() => handleInputBlur(index)}
                                        />
                                        {!isLoadingPrices && token && (
                                            <AmountActionButtons
                                                data={getPresetButtons(index).map((button) => ({
                                                    content: button.content,
                                                    action: button.action,
                                                }))}
                                                isDisabled={token.amount === 0n}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add another asset button - only show for multi-asset types */}
                        {isMultiAssetType && (
                            <button
                                className="light-borders flex items-center justify-center gap-2 flex-col py-8 mb-8"
                                onClick={handleAddAnotherAsset}
                            >
                                <div className="bg-[#35A18B] rounded-full h-[44px] w-[44px] aspect-square flex items-center justify-center">
                                    <Plus size={24} color={"white"} />
                                </div>
                                <span className="text-[#35A18B] text-[14px] font-medium">
                                    {t("create.add_another_asset")}
                                </span>
                            </button>
                        )}

                        <div className="flex-grow mt-auto flex items-end">
                            <FixedBottomButton
                                type="submit"
                                variant="default"
                                size="lg"
                                className="w-full fixed bottom-4 disabled:bg-disabledgreen"
                                onClick={(e) => {
                                    e.preventDefault();

                                    // Check if all assets have sufficient amounts
                                    let hasError = false;
                                    console.log("🚀 currentAssets: ", currentAssets);
                                    currentAssets.forEach((asset, index) => {
                                        const token = filteredTokenList?.find(
                                            (token) => token.address === asset.address,
                                        );

                                        if (asset.amount === BigInt(0)) {
                                            showToast(
                                                t("create.amount_error"),
                                                `Asset #${index + 1}: ${t("create.amount_error_message")}`,
                                                "error",
                                            );
                                            hasError = true;
                                        }

                                        const hasEnoughBalance =
                                            token &&
                                            token.amount !== null &&
                                            typeof token.amount !== "undefined" &&
                                            Number(asset.amount) <= Number(token.amount);

                                        if (!hasEnoughBalance) {
                                            showToast(
                                                "Error",
                                                `Asset #${index + 1}: Insufficient balance`,
                                                "error",
                                            );
                                            hasError = true;
                                        }
                                    });

                                    if (hasError) return;

                                    if (link && currentAssets.length > 0) {
                                        updateUserInput(link.id, {
                                            state: LINK_STATE.CREATE_LINK,
                                        });

                                        if (isMultiAssetType) {
                                            // For multi-asset links, pass all assets to the onSubmit function
                                            onSubmit({
                                                tokenAddress: currentAssets[0].address, // Keep primary token for backward compatibility
                                                assetNumber: parseFloat(displayValues[0] || "0"),
                                                usdNumber: isUsdArray[0]
                                                    ? parseFloat(displayValues[0] || "0")
                                                    : null,
                                                amount: currentAssets[0].amount,
                                                // Add additional data for multi-asset processing
                                                multiAssets: currentAssets.map((asset) => ({
                                                    tokenAddress: asset.address,
                                                    amount: asset.amount,
                                                })),
                                            });
                                        } else {
                                            // For single asset links, use the existing format
                                            onSubmit({
                                                tokenAddress: currentAssets[0].address,
                                                assetNumber: parseFloat(displayValues[0] || "0"),
                                                usdNumber: isUsdArray[0]
                                                    ? parseFloat(displayValues[0] || "0")
                                                    : null,
                                                amount: currentAssets[0].amount,
                                            });
                                        }
                                    }
                                }}
                                disabled={
                                    isButtonDisabled ||
                                    !currentAssets.length ||
                                    currentAssets.some((asset) => asset.amount <= BigInt(0))
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
