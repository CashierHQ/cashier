// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { FC, useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import AssetButton from "@/components/asset-button";
import { Label } from "../ui/label";
import { SelectedAssetButtonInfo } from "./selected-asset-button-info";
import { Trash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TipLinkAssetFormSchema, useFormActions } from "./add-asset-hooks";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useTokens } from "@/hooks/useTokens";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { CHAIN, LINK_INTENT_ASSET_LABEL, LINK_TYPE } from "@/services/types/enum";
import { useLinkAction } from "@/hooks/useLinkAction";
import { convertDecimalBigIntToNumber } from "@/utils";
import { FeeHelpers } from "@/utils/helpers/fees";

const USD_AMOUNT_PRESETS = [1, 2, 5];

type AssetFormInputProps = {
    index: number;
    fieldId: string;
    form: UseFormReturn<TipLinkAssetFormSchema>;
    availableAssets: FungibleToken[];
    onAssetSelect: (index: number) => void;
    onRemoveAsset: (index: number) => void;
    showRemoveButton: boolean;
    isAirdrop?: boolean;
    linkId?: string;
    isTip?: boolean;
};

export const AssetFormInput: FC<AssetFormInputProps> = ({
    index,
    form,
    onAssetSelect,
    onRemoveAsset,
    showRemoveButton,
    isAirdrop,
    linkId,
    isTip,
}) => {
    // Add local state for isUsd with initial value from props or default to false
    const [localIsUsd, setLocalIsUsd] = useState<boolean>(false);

    // Add local state for token amount and USD amount with empty initial values
    const [localTokenAmount, setLocalTokenAmount] = useState<string>("");
    const [localUsdAmount, setLocalUsdAmount] = useState<string>("");

    const { link } = useLinkAction();

    const { t } = useTranslation();
    const {
        getValues,
        formState: { errors },
        watch,
    } = form;
    const { getToken, getTokenPrice } = useTokens();
    const { updateUserInput, getUserInput } = useLinkCreationFormStore();

    // Get current asset data
    const asset = getValues(`assets.${index}`);
    const token = getToken(asset.tokenAddress);
    const tokenUsdPrice = token?.address ? getTokenPrice(token.address) : undefined;
    const canConvert = tokenUsdPrice !== undefined;
    const decimals = token?.decimals || 8;

    // Watch for form amount changes to sync with local state
    const formAmount = watch(`assets.${index}.amount`);
    const formTokenAddress = watch(`assets.${index}.tokenAddress`);
    const formLabel = watch(`assets.${index}.label`);

    // Sync local state with form when form amount changes
    useEffect(() => {
        if (token && formAmount !== undefined) {
            const tokenAmountNumber = Number(formAmount) / 10 ** decimals;

            // Only set non-zero values
            if (tokenAmountNumber > 0) {
                setLocalTokenAmount(tokenAmountNumber.toString());

                if (canConvert && tokenUsdPrice) {
                    const usdValue = tokenAmountNumber * tokenUsdPrice;
                    setLocalUsdAmount(
                        usdValue.toLocaleString("en-US", {
                            useGrouping: false,
                            maximumFractionDigits: 7,
                        }),
                    );
                }
            }
        }
    }, [formAmount, token, decimals, canConvert, tokenUsdPrice]);

    // Sync with store when form values change
    useEffect(() => {
        if (linkId && token && formAmount !== undefined) {
            syncToStore();
        }
    }, [formAmount, formTokenAddress, formLabel, linkId, token]);

    useEffect(() => {
        if (!canConvert) {
            setLocalIsUsd(false);
        }
    }, [canConvert]);

    // Watch for token changes to reset amounts
    useEffect(() => {
        setLocalTokenAmount("");
        setLocalUsdAmount("");
    }, [formTokenAddress]);

    const { setTokenAmount, setUsdAmount } = useFormActions(form, localIsUsd, index);

    // Function to sync current asset to the store
    const syncToStore = () => {
        if (!linkId) return;

        const currentInput = getUserInput(linkId);
        if (!currentInput) return;

        const formAssets = getValues("assets");
        if (!formAssets || formAssets.length === 0) return;

        // Map the current assets to the format expected by the store
        const storeAssets = formAssets.map((asset) => {
            // Ensure the label is always a string, never undefined
            let label = asset.label || "";

            if (link?.linkType === LINK_TYPE.SEND_TOKEN_BASKET) {
                label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_TOKEN_BASKET_ASSET}_${asset.tokenAddress}`;
            } else if (link?.linkType === LINK_TYPE.SEND_AIRDROP) {
                label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_SEND_AIRDROP_ASSET}`;
            } else if (link?.linkType === LINK_TYPE.RECEIVE_PAYMENT) {
                label = `${LINK_INTENT_ASSET_LABEL.INTENT_LABEL_RECEIVE_PAYMENT_ASSET}`;
            }

            return {
                address: asset.tokenAddress,
                linkUseAmount: asset.amount,
                chain: CHAIN.IC,
                label: label,
            };
        });

        // Update the store with the latest values
        updateUserInput(linkId, {
            assets: storeAssets,
        });
    };

    // Handle amount changes
    const handleAmountChange = (value: string) => {
        if (localIsUsd) {
            setLocalUsdAmount(value);

            // Update token amount based on USD
            if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
                const tokenValue = parseFloat(value) / tokenUsdPrice;
                setLocalTokenAmount(tokenValue.toString());
                setUsdAmount(value);
            } else {
                setUsdAmount(value);
            }
        } else {
            setLocalTokenAmount(value);

            // Update USD amount based on token
            if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
                const usdValue = parseFloat(value) * tokenUsdPrice;
                setLocalUsdAmount(usdValue.toFixed(7));
                setTokenAmount(value);
            } else {
                setTokenAmount(value);
            }
        }
    };

    // Handle toggling USD mode
    const handleToggleUsd = (value: boolean) => {
        setLocalIsUsd(value);
    };

    return (
        <div className={` ${showRemoveButton ? "" : ""}`}>
            <div className="input-label-field-container">
                {/* Asset header with optional remove button */}
                <div className="flex w-full items-center">
                    <Label>{isAirdrop ? `Asset per claim` : `${t("create.asset")}`}</Label>
                    {showRemoveButton && (
                        <button
                            className="text-destructive hover:bg-destructive/10 rounded-full p-1"
                            onClick={() => onRemoveAsset(index)}
                        >
                            <Trash className="ml-1" size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            const maxTokenAmount = convertDecimalBigIntToNumber(
                                token?.amount || 0n,
                                token?.decimals || 8,
                            );
                            if (!token) return;
                            const feeAmount = FeeHelpers.calculateNetworkFees(token);

                            const maxTokenAmountWithoutFee = maxTokenAmount - feeAmount;

                            setLocalTokenAmount(maxTokenAmountWithoutFee.toString());

                            // Also update the USD value if conversion is possible
                            if (
                                canConvert &&
                                tokenUsdPrice &&
                                !isNaN(parseFloat(maxTokenAmountWithoutFee.toString()))
                            ) {
                                const usdValue =
                                    parseFloat(maxTokenAmountWithoutFee.toString()) * tokenUsdPrice;
                                setLocalUsdAmount(usdValue.toFixed(7));
                            }

                            // Update the form value
                            setTokenAmount(maxTokenAmountWithoutFee.toString());
                        }}
                        className="ml-auto text-[#36A18B] text-[12px] font-medium"
                    >
                        Max
                    </button>
                </div>

                {/* Asset selector */}
                <div className="">
                    <AssetButton
                        handleClick={() => onAssetSelect(index)}
                        text="Choose Asset"
                        childrenNode={<SelectedAssetButtonInfo selectedToken={token} />}
                        tokenValue={localTokenAmount}
                        usdValue={localUsdAmount}
                        onInputChange={(value) => handleAmountChange(value)}
                        isUsd={localIsUsd}
                        token={token}
                        onToggleUsd={handleToggleUsd}
                        canConvert={canConvert}
                        tokenDecimals={decimals}
                        showPresetButtons={isAirdrop || isTip}
                        presetButtons={USD_AMOUNT_PRESETS.map((amount) => ({
                            content: `${amount} USD`,
                            action: () => {
                                const value = amount.toString();
                                setLocalUsdAmount(value);

                                // Update token amount based on USD
                                if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
                                    const tokenValue = parseFloat(value) / tokenUsdPrice;
                                    setLocalTokenAmount(tokenValue.toString());
                                    setUsdAmount(value);
                                } else {
                                    setUsdAmount(value);
                                }
                            },
                        }))}
                        showMaxButton={true}
                        onMaxClick={() => {
                            const maxTokenAmount = convertDecimalBigIntToNumber(
                                token?.amount || 0n,
                                token?.decimals || 8,
                            ).toString();

                            setLocalTokenAmount(maxTokenAmount);

                            // Also update the USD value if conversion is possible
                            if (canConvert && tokenUsdPrice && !isNaN(parseFloat(maxTokenAmount))) {
                                const usdValue = parseFloat(maxTokenAmount) * tokenUsdPrice;
                                setLocalUsdAmount(usdValue.toFixed(7));
                            }

                            // Update the form value
                            setTokenAmount(maxTokenAmount);
                        }}
                        isTip={isTip}
                    />
                </div>
            </div>

            {/* Amount input section */}
            {/* <div className="input-label-field-container">
                <div className="flex justify-between items-center">
                    <Label>{isAirdrop ? "Amount per claim" : t("create.amount")}</Label>
                    {token && (
                        <UsdSwitch
                            token={token}
                            amount={parseFloat(localTokenAmount) || 0}
                            symbol={token?.name ?? ""}
                            isUsd={localIsUsd}
                            onToggle={handleToggleUsd}
                            canConvert={canConvert}
                            tokenDecimals={decimals}
                            usdDecimals={2}
                        />
                    )}
                </div>
                <IconInput
                    type="number"
                    step="any"
                    isCurrencyInput={true}
                    currencySymbol={localIsUsd ? "USD" : token?.name || ""}
                    value={
                        localIsUsd
                            ? localUsdAmount === "0"
                                ? ""
                                : localUsdAmount
                            : localTokenAmount === "0"
                              ? ""
                              : localTokenAmount
                    }
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        handleAmountChange(e.target.value);
                    }}
                    placeholder={isAirdrop ? "Enter amount per claim" : "Enter amount"}
                />
                {errors.assets?.[index]?.amount && (
                    <div className="text-destructive text-sm mt-1">
                        {errors.assets[index]?.amount?.message}
                    </div>
                )}
            </div> */}
        </div>
    );
};
